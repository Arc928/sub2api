//go:build unit

package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestListPlazaGroups_AllowlistFiltersChannelModels(t *testing.T) {
	channels := []Channel{
		plazaPricedChannel(1, "catalog", []int64{10, 20, 30, 40, 50}, PlatformOpenAI,
			"gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"),
	}
	groups := []Group{
		{
			ID: 10, Name: "exact", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"gpt-5.6-sol", "GPT-6-ASTRA"}},
		},
		{
			ID: 20, Name: "wildcard", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"gpt-5.6-*"}},
		},
		{
			ID: 30, Name: "disabled", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: false, Models: []string{"gpt-5.6-sol"}},
		},
		{
			ID: 40, Name: "empty", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true},
		},
		{
			ID: 50, Name: "whitespace", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"  ", "\t"}},
		},
	}

	out, err := newPlazaService(channels, groups, nil).ListGroups(context.Background())

	require.NoError(t, err)
	require.Len(t, out, 3, "enabled empty or whitespace-only allowlists must hide the group")

	byGroup := make(map[string]PlazaGroup, len(out))
	for _, group := range out {
		byGroup[group.Name] = group
	}

	exactModels := plazaModelsByName(byGroup["exact"].Models)
	require.Len(t, exactModels, 2)
	require.Contains(t, exactModels, "gpt-5.6-sol")
	require.Contains(t, exactModels, "gpt-6-astra")
	require.NotNil(t, exactModels["gpt-6-astra"].Pricing)
	require.InDelta(t, 3e-6, *exactModels["gpt-6-astra"].Pricing.InputPrice, 1e-15)

	var wildcardNames []string
	for _, m := range byGroup["wildcard"].Models {
		wildcardNames = append(wildcardNames, m.Name)
	}
	require.Equal(t, []string{"gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.6-terra"}, wildcardNames)

	require.Len(t, byGroup["disabled"].Models, 4)
	require.NotContains(t, byGroup, "empty")
	require.NotContains(t, byGroup, "whitespace")
}

func TestListPlazaGroups_AllowlistSupplementsExactEntriesOnUnrestrictedChannel(t *testing.T) {
	pricingSvc := newStubPricingServiceFromMap(map[string]*LiteLLMModelPricing{
		"gpt-5.4": {
			Mode:                    "chat",
			InputCostPerToken:       2.5e-6,
			OutputCostPerToken:      1.5e-5,
			CacheReadInputTokenCost: 2.5e-7,
		},
	})

	t.Run("partial catalog channel supplements missing exact entries", func(t *testing.T) {
		channels := []Channel{
			plazaPricedChannel(1, "partial", []int64{10}, PlatformOpenAI, "gpt-5.6-sol"),
		}
		groups := []Group{{
			ID: 10, Name: "g-partial", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{
				Enabled: true,
				Models:  []string{"gpt-5.6-sol", "gpt-5.4", "GPT-5.4", "gpt-9-*"},
			},
		}}

		out, err := newPlazaService(channels, groups, pricingSvc).ListGroups(context.Background())
		require.NoError(t, err)
		require.Len(t, out, 1)

		byName := plazaModelsByName(out[0].Models)
		require.Len(t, byName, 2, "duplicate casing and unmatched wildcards must not produce extra rows")
		require.Contains(t, byName, "gpt-5.6-sol")
		require.Contains(t, byName, "gpt-5.4")
		require.Equal(t, PlatformOpenAI, byName["gpt-5.4"].Platform)
		require.NotNil(t, byName["gpt-5.4"].Pricing)
		require.InDelta(t, 2.5e-6, *byName["gpt-5.4"].Pricing.InputPrice, 1e-15)
		require.InDelta(t, 1.5e-5, *byName["gpt-5.4"].Pricing.OutputPrice, 1e-15)
		require.InDelta(t, 2.5e-7, *byName["gpt-5.4"].Pricing.CacheReadPrice, 1e-15)
		require.InDelta(t, 3e-6, *byName["gpt-5.6-sol"].Pricing.InputPrice, 1e-15)

		billingOut, err := newPlazaServiceWithBilling(
			channels,
			groups,
			map[int64]string{10: PlatformOpenAI},
			pricingSvc,
		).ListGroups(context.Background())
		require.NoError(t, err)
		require.Len(t, billingOut, 1)
		billingByName := plazaModelsByName(billingOut[0].Models)
		require.NotNil(t, billingByName["gpt-5.4"].Pricing)
		require.InDelta(t, 2.5e-6, *billingByName["gpt-5.4"].Pricing.InputPrice, 1e-15)
		require.NotNil(t, billingByName["gpt-5.4"].OfficialPricing)
		require.InDelta(t, 2.5e-6, *billingByName["gpt-5.4"].OfficialPricing.InputPrice, 1e-15)
		require.InDelta(t, 1.5e-5, *billingByName["gpt-5.4"].OfficialPricing.OutputPrice, 1e-15)
	})

	t.Run("empty passthrough channel supplements exact entries with billing and official pricing", func(t *testing.T) {
		channels := []Channel{{
			ID:             2,
			Name:           "passthrough",
			Status:         StatusActive,
			RestrictModels: false,
			GroupIDs:       []int64{10},
		}}
		groups := []Group{{
			ID: 10, Name: "g-passthrough", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{
				Enabled: true,
				Models:  []string{"gpt-5.4", "gpt-9-*"},
			},
		}}

		out, err := newPlazaServiceWithBilling(
			channels,
			groups,
			map[int64]string{10: PlatformOpenAI},
			pricingSvc,
		).ListGroups(context.Background())
		require.NoError(t, err)
		require.Len(t, out, 1)
		require.Len(t, out[0].Models, 1)

		m := out[0].Models[0]
		require.Equal(t, "gpt-5.4", m.Name)
		require.Equal(t, PlatformOpenAI, m.Platform)
		require.NotNil(t, m.Pricing)
		require.InDelta(t, 2.5e-6, *m.Pricing.InputPrice, 1e-15)
		require.NotNil(t, m.OfficialPricing)
		require.InDelta(t, 2.5e-6, *m.OfficialPricing.InputPrice, 1e-15)
	})
}

func TestListPlazaGroups_AllowlistRespectsChannelRestrictModelsAndInactiveChannels(t *testing.T) {
	pricingSvc := newStubPricingServiceFromMap(map[string]*LiteLLMModelPricing{
		"gpt-5.4": {
			Mode:               "chat",
			InputCostPerToken:  2.5e-6,
			OutputCostPerToken: 1.5e-5,
		},
	})

	restricted := plazaPricedChannel(1, "restricted", []int64{10, 20, 40}, PlatformOpenAI, "gpt-5.6-sol", "gpt-5.6-terra")
	restricted.RestrictModels = true

	disabledUnrestricted := Channel{
		ID:             2,
		Name:           "disabled-unrestricted",
		Status:         StatusDisabled,
		RestrictModels: false,
		GroupIDs:       []int64{30},
	}

	activeUnrestricted := Channel{
		ID:             3,
		Name:           "active-unrestricted",
		Status:         StatusActive,
		RestrictModels: false,
		GroupIDs:       []int64{40},
	}

	groups := []Group{
		{
			ID: 10, Name: "restricted-intersection", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"gpt-5.6-sol", "gpt-5.4"}},
		},
		{
			ID: 20, Name: "restricted-empty", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"gpt-5.4"}},
		},
		{
			ID: 30, Name: "disabled-channel", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"gpt-5.4"}},
		},
		{
			ID: 40, Name: "mixed-channels", Platform: PlatformOpenAI, RateMultiplier: 1,
			ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"gpt-5.6-sol", "gpt-5.4"}},
		},
	}

	out, err := newPlazaService(
		[]Channel{restricted, disabledUnrestricted, activeUnrestricted},
		groups,
		pricingSvc,
	).ListGroups(context.Background())

	require.NoError(t, err)
	require.Len(t, out, 2)

	byGroup := make(map[string]PlazaGroup, len(out))
	for _, g := range out {
		byGroup[g.Name] = g
	}

	require.Contains(t, byGroup, "restricted-intersection")
	require.Len(t, byGroup["restricted-intersection"].Models, 1)
	require.Equal(t, "gpt-5.6-sol", byGroup["restricted-intersection"].Models[0].Name)

	require.NotContains(t, byGroup, "restricted-empty")
	require.NotContains(t, byGroup, "disabled-channel")

	mixedModels := plazaModelsByName(byGroup["mixed-channels"].Models)
	require.Len(t, mixedModels, 2)
	require.Contains(t, mixedModels, "gpt-5.6-sol")
	require.InDelta(t, 3e-6, *mixedModels["gpt-5.6-sol"].Pricing.InputPrice, 1e-15)
	require.Contains(t, mixedModels, "gpt-5.4")
	require.InDelta(t, 2.5e-6, *mixedModels["gpt-5.4"].Pricing.InputPrice, 1e-15)
}

func TestListPlazaGroups_AllowlistCompositeGroupFiltersWithoutFabricatingPlatform(t *testing.T) {
	channels := []Channel{{
		ID:             1,
		Name:           "multi",
		Status:         StatusActive,
		RestrictModels: false,
		GroupIDs:       []int64{10},
		ModelPricing: []ChannelModelPricing{
			{
				Platform:    PlatformOpenAI,
				Models:      []string{"gpt-5.6-sol", "gpt-5.6-terra"},
				BillingMode: BillingModeToken,
				InputPrice:  testPtrFloat64(3e-6),
				OutputPrice: testPtrFloat64(1.5e-5),
			},
			{
				Platform:    PlatformAnthropic,
				Models:      []string{"claude-sonnet", "claude-opus"},
				BillingMode: BillingModeToken,
				InputPrice:  testPtrFloat64(3e-6),
				OutputPrice: testPtrFloat64(1.5e-5),
			},
		},
	}}
	groups := []Group{{
		ID: 10, Name: "composite", Platform: PlatformComposite, RateMultiplier: 1,
		ModelAllowlist: GroupModelAllowlist{
			Enabled: true,
			Models:  []string{"gpt-5.6-sol", "claude-sonnet", "gpt-5.4"},
		},
	}}

	out, err := newPlazaService(channels, groups, nil).ListGroups(context.Background())

	require.NoError(t, err)
	require.Len(t, out, 1)

	byName := plazaModelsByName(out[0].Models)
	require.Len(t, byName, 2)
	require.Equal(t, PlatformAnthropic, byName["claude-sonnet"].Platform)
	require.Equal(t, PlatformOpenAI, byName["gpt-5.6-sol"].Platform)
	require.NotContains(t, byName, "gpt-5.4")
	for _, m := range out[0].Models {
		require.NotEqual(t, PlatformComposite, m.Platform)
	}
}
