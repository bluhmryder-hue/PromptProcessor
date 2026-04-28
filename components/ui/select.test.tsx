import * as React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select"

// Mock ResizeObserver which is used by Base UI/Radix UI but not available in jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe("Select Component", () => {
  it("renders the select trigger with placeholder", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByRole("combobox")).toBeInTheDocument()
    expect(screen.getByText("Select an option")).toBeInTheDocument()
  })

  it("opens the select content when clicked", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    // Wait for the content to be visible
    await waitFor(() => {
      expect(screen.getByText("Option 1")).toBeInTheDocument()
      expect(screen.getByText("Option 2")).toBeInTheDocument()
    })
  })

  it("changes the value when an option is selected", async () => {
    const onValueChange = vi.fn()
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    const option2 = await screen.findByText("Option 2")
    fireEvent.click(option2)

    expect(onValueChange).toHaveBeenCalledWith("option2")
    // Note: In some implementations, SelectValue might update immediately,
    // in others it might need the Popover to close.
    // Base UI might have its own behavior.
  })

  it("renders with groups and labels", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group 1</SelectLabel>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    )

    fireEvent.click(screen.getByRole("combobox"))

    await waitFor(() => {
      expect(screen.getByText("Group 1")).toBeInTheDocument()
      expect(screen.getByText("Option 1")).toBeInTheDocument()
    })
  })
})
