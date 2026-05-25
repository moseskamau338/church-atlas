import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppHeader from '../src/components/AppHeader.vue'
import churchData from '../src/data/church-data.js'

function factory(overrides = {}) {
  return mount(AppHeader, {
    props: {
      data: churchData,
      exporting: false,
      showCardPanel: false,
      showMore: false,
      baseLayer: 'satellite',
      tweaks: {
        showPopulation: true,
        showEdges: true,
        showDistances: true,
        showSabbath: true,
        paperTone: 'cream',
        showHeatmap: false,
      },
      ...overrides,
    },
  })
}

describe('AppHeader', () => {
  it('renders district masthead text', () => {
    const w = factory()
    expect(w.get('.masthead__title').text()).toBe(churchData.district.name)
    expect(w.text()).toContain(churchData.district.county)
    expect(w.text()).toContain(churchData.district.subCounty)
  })

  it('emits fit, toggle-more, export', async () => {
    const w = factory()
    const [fit, exportPng] = w.findAll('.ctl-btn, .split-btn__main')
    await fit.trigger('click')
    await exportPng.trigger('click')
    await w.get('.split-btn__chevron').trigger('click')

    expect(w.emitted('fit')).toHaveLength(1)
    expect(w.emitted('export')).toHaveLength(1)
    expect(w.emitted('toggle-more')).toHaveLength(1)
  })

  it('disables export button + shows spinner while exporting', () => {
    const w = factory({ exporting: true })
    const exportBtn = w.get('.split-btn__main')
    expect(exportBtn.attributes('disabled')).toBeDefined()
    expect(w.find('.ctl-spinner').exists()).toBe(true)
    expect(exportBtn.text()).toContain('Exporting')
  })


  it('renders the MorePanel only when showMore=true', async () => {
    const closed = factory({ showMore: false })
    expect(closed.find('.more-panel').exists()).toBe(false)
    const open = factory({ showMore: true })
    expect(open.find('.more-panel').exists()).toBe(true)
  })
})
