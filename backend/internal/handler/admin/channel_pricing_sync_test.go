//go:build unit

package admin

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestSyncPricingModels_AntigravityIncludesAnthropicAndGemini(t *testing.T) {
	dir := t.TempDir()
	catalogPath := filepath.Join(dir, "pricing.json")
	catalogJSON := `{
		"claude-sonnet-4-6": {"litellm_provider": "anthropic", "mode": "chat", "input_cost_per_token": 3e-6, "output_cost_per_token": 1.5e-5},
		"gemini-4-argon": {"litellm_provider": "gemini", "mode": "chat", "input_cost_per_token": 2e-6, "output_cost_per_token": 1e-5},
		"gemini-4-neon": {"litellm_provider": "gemini", "mode": "chat", "input_cost_per_token": 3e-6, "output_cost_per_token": 1.5e-5},
		"gemini-2.5-pro": {"litellm_provider": "vertex_ai-language-models", "mode": "chat", "input_cost_per_token": 1.25e-6, "output_cost_per_token": 1e-5},
		"gpt-5.4": {"litellm_provider": "openai", "mode": "chat", "input_cost_per_token": 2.5e-6, "output_cost_per_token": 1.5e-5}
	}`
	require.NoError(t, os.WriteFile(catalogPath, []byte(catalogJSON), 0o600))

	svc := service.NewPricingService(&config.Config{
		Pricing: config.PricingConfig{
			DataDir:      dir,
			FallbackFile: catalogPath,
		},
	}, nil)
	require.NoError(t, svc.Initialize())
	t.Cleanup(svc.Stop)

	router := setupSyncPricingModelsRouter(svc)

	for _, tc := range []struct {
		platform string
		want     []string
	}{
		{
			platform: "antigravity",
			want:     []string{"claude-sonnet-4-6", "gemini-4-argon", "gemini-4-neon"},
		},
		{
			platform: "gemini",
			want:     []string{"gemini-4-argon", "gemini-4-neon"},
		},
		{
			platform: "anthropic",
			want:     []string{"claude-sonnet-4-6"},
		},
	} {
		t.Run(tc.platform, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/channels/pricing/sync-models?platform="+tc.platform, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, http.StatusOK, w.Code)
			var body struct {
				Data struct {
					Models []string `json:"models"`
				} `json:"data"`
			}
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			require.Equal(t, tc.want, body.Data.Models)
		})
	}
}
