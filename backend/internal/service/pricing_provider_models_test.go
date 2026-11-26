//go:build unit

package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestListModelNamesByProviders_ExactProvidersOnly(t *testing.T) {
	svc := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"claude-sonnet-4-6": {LiteLLMProvider: "anthropic", InputCostPerToken: 3e-6},
			"gemini-4-argon":    {LiteLLMProvider: "gemini", InputCostPerToken: 2e-6},
			"gemini-4-neon":     {LiteLLMProvider: "Gemini", InputCostPerToken: 3e-6},
			"gemini-2.5-pro":    {LiteLLMProvider: "vertex_ai-language-models", InputCostPerToken: 1.25e-6},
			"gpt-5.4":           {LiteLLMProvider: "openai", InputCostPerToken: 2.5e-6},
		},
	}

	got := svc.ListModelNamesByProviders("anthropic", "gemini", "GEMINI")
	require.Equal(t, []string{
		"claude-sonnet-4-6",
		"gemini-4-argon",
		"gemini-4-neon",
	}, got)

	geminiOnly := svc.ListModelNamesByProvider("gemini")
	require.Equal(t, []string{"gemini-4-argon", "gemini-4-neon"}, geminiOnly)

	empty := svc.ListModelNamesByProviders()
	require.NotNil(t, empty)
	require.Empty(t, empty)

	blank := svc.ListModelNamesByProviders("  ")
	require.NotNil(t, blank)
	require.Empty(t, blank)
}
