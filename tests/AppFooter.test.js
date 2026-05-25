import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppFooter from '../src/components/AppFooter.vue'
import churchData from '../src/data/church-data.js'

describe('AppFooter', () => {
  const wrapper = mount(AppFooter, { props: { data: churchData } })

  it('renders all six stats with dividers between them', () => {
    const stats = wrapper.findAll('.stat')
    expect(stats).toHaveLength(6)
    expect(wrapper.findAll('.stat-divider')).toHaveLength(5)
  })

  it('formats membership and reachable-pop with thousands separators', () => {
    const text = wrapper.text()
    expect(text).toContain(churchData.summary.totalMembers.toLocaleString())
    expect(text).toContain(churchData.summary.reachablePop.toLocaleString())
  })

  it('shows the district leader and title', () => {
    expect(wrapper.text()).toContain(churchData.district.leader)
    expect(wrapper.text()).toContain(churchData.district.leaderTitle)
  })

  it('links to the CC BY 4.0 license', () => {
    const link = wrapper.get('a.colophon__license-link')
    expect(link.attributes('href')).toBe('https://creativecommons.org/licenses/by/4.0/')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('renders the app version (from package.json via __APP_VERSION__)', () => {
    const v = wrapper.get('.colophon__version').text()
    // Match `v<semver>`, accepting pre-release suffixes (e.g. v1.0.0-beta.1).
    expect(v).toMatch(/^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/)
  })
})
