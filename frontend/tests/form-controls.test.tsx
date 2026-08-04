import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef, useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheckboxWithLabel } from "@/components/site/form/checkbox-with-label";
import { JsonInput } from "@/components/site/form/json-input";
import { TextInput } from "@/components/site/form/text-input";
import { SelectMenu } from "@/components/site/select-menu";

type JsonInputHarnessProps = Partial<ComponentProps<typeof JsonInput>> & {
  initialValue?: string;
  onHarnessValueChange?: (value: string) => void;
};

function JsonInputHarness({
  initialValue = "",
  onHarnessValueChange,
  ...props
}: JsonInputHarnessProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <JsonInput
      description="Define a JSON object."
      formatLabel="Format JSON"
      label="Response type"
      {...props}
      value={value}
      onValueChange={(nextValue) => {
        setValue(nextValue);
        onHarnessValueChange?.(nextValue);
      }}
    />
  );
}

describe("shared form controls", () => {
  it("owns JSON field semantics, formatting, and invalid-format feedback", () => {
    const ref = createRef<HTMLTextAreaElement>();
    const onInvalidFormat = vi.fn();
    const onValueChange = vi.fn();
    const view = render(
      <JsonInput
        ref={ref}
        description="Paste a representative payload."
        error="Enter valid JSON."
        formatAriaLabel="Format response JSON"
        formatLabel="Format JSON"
        label="Response JSON"
        name="response-json"
        value={'{"name":"Ada"}'}
        onInvalidFormat={onInvalidFormat}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Response JSON" });
    expect(ref.current).toBe(input);
    expect(input).toHaveAccessibleDescription(
      "Paste a representative payload. Enter valid JSON.",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("autocapitalize", "off");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("autocorrect", "off");

    fireEvent.click(screen.getByRole("button", { name: "Format response JSON" }));
    expect(onValueChange).toHaveBeenCalledWith('{\n  "name": "Ada"\n}');

    view.rerender(
      <JsonInput
        description="Paste a representative payload."
        formatAriaLabel="Format response JSON"
        formatLabel="Format JSON"
        label="Response JSON"
        name="response-json"
        value={'{"name":'}
        onInvalidFormat={onInvalidFormat}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Format response JSON" }));
    expect(onInvalidFormat).toHaveBeenCalledTimes(1);
    expect(input).toHaveFocus();
  });

  it.each([
    { closing: "}", opening: "{" },
    { closing: "]", opening: "[" },
    { closing: "\"", opening: "\"" },
  ])("pairs and wraps JSON $opening characters", ({ closing, opening }) => {
    const view = render(<JsonInputHarness />);
    const input = screen.getByRole("textbox", {
      name: "Response type",
    }) as HTMLTextAreaElement;

    fireEvent.keyDown(input, { key: opening });
    expect(input).toHaveValue(`${opening}${closing}`);
    expect(input).toHaveProperty("selectionStart", 1);
    expect(input).toHaveProperty("selectionEnd", 1);

    view.unmount();
    render(<JsonInputHarness initialValue="field" />);
    const selectedInput = screen.getByRole("textbox", {
      name: "Response type",
    }) as HTMLTextAreaElement;
    selectedInput.setSelectionRange(0, 5);
    fireEvent.keyDown(selectedInput, { key: opening });

    expect(selectedInput).toHaveValue(`${opening}field${closing}`);
    expect(selectedInput).toHaveProperty("selectionStart", 1);
    expect(selectedInput).toHaveProperty("selectionEnd", 6);
  });

  it.each([
    { key: "}", pair: "{}" },
    { key: "]", pair: "[]" },
    { key: "\"", pair: "\"\"" },
  ])("skips an existing JSON $key closing character", ({ key, pair }) => {
    render(<JsonInputHarness initialValue={pair} />);
    const input = screen.getByRole("textbox", {
      name: "Response type",
    }) as HTMLTextAreaElement;
    input.setSelectionRange(1, 1);

    fireEvent.keyDown(input, { key });

    expect(input).toHaveValue(pair);
    expect(input).toHaveProperty("selectionStart", 2);
    expect(input).toHaveProperty("selectionEnd", 2);
  });

  it.each([
    { key: "Backspace", pair: "{}", selection: 1 },
    { key: "Delete", pair: "{}", selection: 0 },
    { key: "Backspace", pair: "[]", selection: 1 },
    { key: "Delete", pair: "\"\"", selection: 0 },
  ])(
    "deletes both empty JSON pair characters with $key",
    ({ key, pair, selection }) => {
      render(<JsonInputHarness initialValue={pair} />);
      const input = screen.getByRole("textbox", {
        name: "Response type",
      }) as HTMLTextAreaElement;
      input.setSelectionRange(selection, selection);

      fireEvent.keyDown(input, { key });

      expect(input).toHaveValue("");
      expect(input).toHaveProperty("selectionStart", 0);
      expect(input).toHaveProperty("selectionEnd", 0);
    },
  );

  it("adds structural and current-line indentation on Enter", () => {
    render(<JsonInputHarness initialValue="{}" />);
    const input = screen.getByRole("textbox", {
      name: "Response type",
    }) as HTMLTextAreaElement;
    input.setSelectionRange(1, 1);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("{\n  \n}");
    expect(input).toHaveProperty("selectionStart", 4);

    fireEvent.change(input, { target: { value: "{\n  \"name\": \"Ada\"" } });
    input.setSelectionRange(input.value.length, input.value.length);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("{\n  \"name\": \"Ada\"\n  ");
    expect(input).toHaveProperty("selectionStart", input.value.length);
  });

  it("pairs structural characters produced by a keyboard layout modifier", () => {
    render(<JsonInputHarness />);
    const input = screen.getByRole("textbox", {
      name: "Response type",
    }) as HTMLTextAreaElement;

    fireEvent.keyDown(input, { altKey: true, key: "{" });

    expect(input).toHaveValue("{}");
    expect(input).toHaveProperty("selectionStart", 1);
  });

  it("only takes over Tab and character keys when an editing aid applies", () => {
    const onKeyDown = vi.fn();
    const onValueChange = vi.fn();
    render(
      <JsonInputHarness
        initialValue={'{"value":"text"}'}
        onHarnessValueChange={onValueChange}
        onKeyDown={onKeyDown}
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "Response type",
    }) as HTMLTextAreaElement;
    input.setSelectionRange(11, 11);

    expect(fireEvent.keyDown(input, { key: "{" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(input, {
      ctrlKey: true,
      key: "[",
    })).toBe(true);
    expect(fireEvent.keyDown(input, {
      isComposing: true,
      key: "{",
      keyCode: 229,
    })).toBe(true);

    expect(input).toHaveValue('{"value":"text"}');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalledTimes(4);
  });

  it("forwards native text-input semantics through the shared surface", () => {
    render(
      <TextInput
        aria-label="Response type"
        name="responseType"
        placeholder="UserResponse"
        required
        trailingControl={(
          <button type="button" aria-label="Toggle optional">
            *
          </button>
        )}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Response type" });
    expect(input).toHaveAttribute("name", "responseType");
    expect(input).toHaveAttribute("placeholder", "UserResponse");
    expect(input).toBeRequired();
    expect(input.parentElement).toContainElement(
      screen.getByRole("button", { name: "Toggle optional" }),
    );
  });

  it("keeps the checkbox and its visible label as one native control", () => {
    render(
      <CheckboxWithLabel
        defaultChecked
        label="Optional"
        name="optional"
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Optional" });
    expect(checkbox).toBeChecked();
    fireEvent.click(screen.getByText("Optional"));
    expect(checkbox).not.toBeChecked();
  });

  it("promotes dialog selects to the native popover layer", async () => {
    const showPopoverDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "showPopover",
    );
    const hidePopoverDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "hidePopover",
    );
    const nativeMatches = Element.prototype.matches;
    const showPopover = vi.fn(function show(this: HTMLElement) {
      this.dataset.testPopoverOpen = "true";
    });
    const hidePopover = vi.fn(function hide(this: HTMLElement) {
      delete this.dataset.testPopoverOpen;
    });
    Object.defineProperty(HTMLElement.prototype, "showPopover", {
      configurable: true,
      value: showPopover,
    });
    Object.defineProperty(HTMLElement.prototype, "hidePopover", {
      configurable: true,
      value: hidePopover,
    });
    const matches = vi.spyOn(Element.prototype, "matches").mockImplementation(
      function matchesPopover(this: Element, selector: string) {
        if (selector === ":popover-open") {
          return (
            this instanceof HTMLElement
            && this.dataset.testPopoverOpen === "true"
          );
        }
        return nativeMatches.call(this, selector);
      },
    );

    try {
      const view = render(
        <dialog open>
          <SelectMenu
            height="large"
            label="Property type"
            menuPlacement="top"
            options={[
              {
                id: "string",
                kind: "action",
                label: "string",
                onSelect: vi.fn(),
              },
            ]}
            rounded
            selectedId="string"
            width="field"
          />
        </dialog>,
      );

      const trigger = screen.getByRole("button", {
        name: "Property type string",
      });
      expect(trigger).not.toHaveAttribute("aria-label");
      expect(trigger).toHaveAttribute("aria-labelledby");
      expect(trigger.getAttribute("aria-labelledby")?.split(" ")).toHaveLength(2);
      fireEvent.click(trigger);
      await waitFor(() => expect(showPopover).toHaveBeenCalledTimes(1));
      const menu = document.querySelector(
        'ul[aria-label="Property type"]',
      );
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveAttribute("popover", "manual");
      expect(menu).toHaveAttribute("data-dialog-layer", "true");
      expect(screen.getByRole("button", {
        name: "Property type string",
      }).parentElement).toHaveAttribute("data-height", "large");
      expect(screen.getByRole("button", {
        name: "Property type string",
      }).parentElement).toHaveAttribute("data-rounded", "true");

      view.unmount();
      expect(hidePopover).toHaveBeenCalledTimes(1);
    } finally {
      matches.mockRestore();
      if (showPopoverDescriptor) {
        Object.defineProperty(
          HTMLElement.prototype,
          "showPopover",
          showPopoverDescriptor,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
      }
      if (hidePopoverDescriptor) {
        Object.defineProperty(
          HTMLElement.prototype,
          "hidePopover",
          hidePopoverDescriptor,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "hidePopover");
      }
    }
  });

  it("preserves focus intentionally moved by a select action", () => {
    render(
      <>
        <input aria-label="New response type name" />
        <SelectMenu
          label="Response type template"
          options={[
            {
              id: "existing",
              kind: "action",
              label: "Existing response",
              onSelect: () => {
                screen.getByRole("textbox", {
                  name: "New response type name",
                }).focus();
              },
            },
          ]}
          selectedId=""
        />
      </>,
    );

    const trigger = screen.getByRole("button", {
      name: "Response type template",
    });
    fireEvent.click(trigger);
    const menu = screen.getByRole("list", {
      name: "Response type template",
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Existing response",
    }));
    fireEvent.animationEnd(menu);

    expect(screen.getByRole("textbox", {
      name: "New response type name",
    })).toHaveFocus();
  });
});
