import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { renderMarkdown } from '../lib/markdown'

function Wrapper({ text }: { text: string }) {
  return <>{renderMarkdown(text)}</>
}

describe('renderMarkdown', () => {
  it('renders nothing for an empty string', () => {
    const { container } = render(<Wrapper text="" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders h1 for # heading', () => {
    render(<Wrapper text="# My Title" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Title')
  })

  it('renders h2 for ## heading', () => {
    render(<Wrapper text="## Section" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section')
  })

  it('renders h3 for ### heading', () => {
    render(<Wrapper text="### Sub-section" />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Sub-section')
  })

  it('renders an unordered list for - prefixed lines', () => {
    render(<Wrapper text={"- apple\n- banana\n- cherry"} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('apple')
    expect(items[2]).toHaveTextContent('cherry')
  })

  it('renders an unordered list for * prefixed lines', () => {
    render(<Wrapper text={"* one\n* two"} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
  })

  it('renders an ordered list for numbered lines', () => {
    render(<Wrapper text={"1. first\n2. second\n3. third"} />)
    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[1]).toHaveTextContent('second')
  })

  it('renders bold text inside <strong>', () => {
    render(<Wrapper text="**important**" />)
    expect(screen.getByText('important').tagName).toBe('STRONG')
  })

  it('renders italic text inside <em>', () => {
    render(<Wrapper text="*subtle*" />)
    expect(screen.getByText('subtle').tagName).toBe('EM')
  })

  it('renders plain paragraph text as a <p>', () => {
    render(<Wrapper text="Just some words." />)
    expect(screen.getByText('Just some words.')).toBeTruthy()
  })

  it('renders inline bold inside a heading', () => {
    render(<Wrapper text="# **Bold** Heading" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.querySelector('strong')).toBeTruthy()
    expect(heading.querySelector('strong')!.textContent).toBe('Bold')
  })

  it('renders multiple paragraphs separated by blank lines', () => {
    render(<Wrapper text={"First paragraph.\n\nSecond paragraph."} />)
    expect(screen.getByText('First paragraph.')).toBeTruthy()
    expect(screen.getByText('Second paragraph.')).toBeTruthy()
  })
})
