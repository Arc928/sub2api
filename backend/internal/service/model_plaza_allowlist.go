package service

import "strings"

// applyGroupModelAllowlists 按各分组的 ModelAllowlist 裁剪并补齐模型广场模型列表：
//   - 未启用白名单的分组保持渠道聚合结果不变；
//   - 启用白名单的分组先用 GroupModelAllowlist.Allows 过滤渠道模型（保留渠道自定义定价，
//     并将通配符规则在渠道模型范围内展开）；
//   - 若该分组为非 composite 分组，且至少关联了一个未开启 RestrictModels 的活跃渠道，
//     则对白名单中不含 `*` 的精确模型条目中尚未命中的部分，按分组平台补齐并走全局定价回落；
//   - 若所有关联活跃渠道均开启 RestrictModels（或无活跃渠道），不补齐渠道外模型，
//     避免展示被渠道拒绝调用的模型。
func (s *ModelPlazaService) applyGroupModelAllowlists(
	byGroup map[int64]*PlazaGroup,
	groupEnt map[int64]*Group,
	channels []Channel,
) {
	unrestrictedGroups := make(map[int64]bool, len(byGroup))
	for i := range channels {
		ch := &channels[i]
		if ch.Status != StatusActive || ch.RestrictModels {
			continue
		}
		for _, gid := range ch.GroupIDs {
			unrestrictedGroups[gid] = true
		}
	}

	for gid, pg := range byGroup {
		g := groupEnt[gid]
		if g == nil || !g.ModelAllowlistEnabled() {
			continue
		}
		if len(g.ModelAllowlist.Models) == 0 {
			pg.Models = nil
			continue
		}

		filtered := make([]PlazaModel, 0, len(pg.Models))
		seen := make(map[string]struct{}, len(pg.Models))
		for _, m := range pg.Models {
			if !g.ModelAllowlist.Allows(m.Name) {
				continue
			}
			filtered = append(filtered, m)
			seen[strings.ToLower(m.Name)] = struct{}{}
		}

		if unrestrictedGroups[gid] && g.Platform != PlatformComposite {
			var extra []SupportedModel
			for _, raw := range g.ModelAllowlist.Models {
				entry := strings.TrimSpace(raw)
				if entry == "" || strings.Contains(entry, "*") {
					continue
				}
				key := strings.ToLower(entry)
				if _, ok := seen[key]; ok {
					continue
				}
				seen[key] = struct{}{}
				extra = append(extra, SupportedModel{
					Name:     entry,
					Platform: g.Platform,
				})
			}
			if len(extra) > 0 {
				fillGlobalPricingFallback(s.pricingService, extra)
				for _, sm := range extra {
					filtered = append(filtered, PlazaModel{
						Name:     sm.Name,
						Platform: sm.Platform,
						Pricing:  sm.Pricing,
					})
				}
			}
		}

		pg.Models = filtered
	}
}
