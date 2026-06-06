// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'

describe('SkeletonCard', () => {
  it('renders the skeleton card with aria-hidden', () => {
    const wrapper = mount(SkeletonCard)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.skeleton-block').exists()).toBe(true)
  })
})
