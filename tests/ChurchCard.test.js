import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChurchCard from '../src/components/ChurchCard.vue'

const church = {
  id: 'gathera',
  name: 'Gathera SDA',
  role: 'Mother Church',
  members: 50,
  founded: 1974,
  services: 'Sabbath · 09:00',
  lat: -0.7837603,
  lng: 37.0441453,
}
const ward = { id: 'gatanga', name: 'Gatanga Ward', population: 14820 }

describe('ChurchCard', () => {
  it('renders church name, role, ward, founded, members, services', () => {
    const w = mount(ChurchCard, { props: { church, ward } })
    expect(w.get('.church-card__name').text()).toBe('Gathera SDA')
    expect(w.get('.church-card__role').text()).toBe('Mother Church')
    const text = w.text()
    expect(text).toContain('Gatanga Ward')
    expect(text).toContain('1974')
    expect(text).toContain('50')
    expect(text).toContain('Sabbath · 09:00')
  })

  it('formats coordinates to 6 decimals and links to Google Maps', () => {
    const w = mount(ChurchCard, { props: { church, ward } })
    const coords = w.get('.church-card__pin-coords').text()
    expect(coords).toBe('-0.783760, 37.044145')
    const link = w.get('a.pin-btn--primary')
    expect(link.attributes('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${church.lat},${church.lng}`,
    )
  })

  it('emits close when the × button is clicked', async () => {
    const w = mount(ChurchCard, { props: { church, ward } })
    await w.get('.church-card__close').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('copies coordinates to clipboard and flips the button label', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const w = mount(ChurchCard, { props: { church, ward } })
    const buttons = w.findAll('.pin-btn')
    const copyBtn = buttons[buttons.length - 1]
    await copyBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(writeText).toHaveBeenCalledWith('-0.783760, 37.044145')
    expect(copyBtn.text()).toContain('Copied')
    vi.unstubAllGlobals()
  })

  it('falls back to em-dash when ward is missing', () => {
    const w = mount(ChurchCard, { props: { church, ward: null } })
    expect(w.text()).toContain('—')
  })
})
