package service

import (
	"sort"
	"strings"
)

// ListModelNamesByProviders returns all unique model names in the catalog whose
// LiteLLMProvider matches any of the given provider strings (case-insensitive).
// Always returns a non-nil alphabetically sorted slice.
func (s *PricingService) ListModelNamesByProviders(providers ...string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	providerSet := make(map[string]struct{}, len(providers))
	for _, provider := range providers {
		if p := strings.ToLower(strings.TrimSpace(provider)); p != "" {
			providerSet[p] = struct{}{}
		}
	}
	names := make([]string, 0)
	if len(providerSet) == 0 {
		return names
	}

	for name, pricing := range s.pricingData {
		if pricing == nil {
			continue
		}
		if _, ok := providerSet[strings.ToLower(pricing.LiteLLMProvider)]; ok {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names
}
