import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppFooter from '../src/components/AppFooter.vue'
import churchData from '../src/data/church-data.js'

describe('AppFooter', () => {
  const wrapper = mount(AppFooter, { props: { data: churchData } })

  it('renders the three curated stats with dividers between them', () => {
    const stats = wrapper.findAll('.stat')
    expect(stats).toHaveLength(3)
    expect(wrapper.findAll('.stat-divider')).toHaveLength(2)
    const labels = stats.map((s) => s.get('.stat__label').text())
    expect(labels).toEqual(['Churches', 'Sabbath Schools', 'Membership'])
  })

  it('formats membership with thousands separators', () => {
    expect(wrapper.text()).toContain(churchData.summary.totalMembers.toLocaleString())
  })

  it('omits the technical stats (reachable pop., wards covered, avg distance)', () => {
    const text = wrapper.text()
    expect(text).not.toContain('Reachable')
    expect(text).not.toContain('Wards Covered')
    expect(text).not.toContain('Avg Distance')
  })

  it('shows the district leader and title', () => {
    expect(wrapper.text()).toContain(churchData.district.leader)
    expect(wrapper.text()).toContain(churchData.district.leaderTitle)
  })

  it('shows the updated date in the byline', () => {
    expect(wrapper.get('.colophon__byline').text()).toContain(churchData.district.updated)
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
