import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MapLegend from '../src/components/MapLegend.vue'

describe('MapLegend', () => {
  it('shows church, distance — and sabbath when enabled, with no mother/local split', () => {
    const w = mount(MapLegend, { props: { showSabbath: true, showHeatmap: false } })
    const labels = w.findAll('.legend__label').map((n) => n.text())
    expect(labels).toContain('Church')
    expect(labels).toContain('Sabbath School')
    expect(labels).toContain('Distance (km)')
    expect(labels).not.toContain('Mother Church')
    expect(labels).not.toContain('Local Church')
    expect(labels).not.toContain('Membership Density')
  })

  it('hides sabbath legend item when showSabbath=false', () => {
    const w = mount(MapLegend, { props: { showSabbath: false, showHeatmap: false } })
    const labels = w.findAll('.legend__label').map((n) => n.text())
    expect(labels).not.toContain('Sabbath School')
  })

  it('shows heatmap legend item when showHeatmap=true', () => {
    const w = mount(MapLegend, { props: { showSabbath: false, showHeatmap: true } })
    const labels = w.findAll('.legend__label').map((n) => n.text())
    expect(labels).toContain('Membership Density')
  })
})
