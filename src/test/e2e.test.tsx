import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthModal from "../components/AuthModal";
import ProductForm from "../components/Dashboard/ProductForm";

describe("E2E React Tests - Authentication Flow (AuthModal)", () => {
  it("should render the authentication modal when open", () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} onAuthSuccess={vi.fn()} />);
    
    // Check if the title or text indicating verification/login is present
    expect(screen.getByText(/ورود اعضا/i)).toBeInTheDocument();
  });

  it("should show error on submitting invalid Iranian phone number", async () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} onAuthSuccess={vi.fn()} />);
    
    // Find phone input by placeholder or name
    const phoneInput = screen.getByPlaceholderText(/مثال: 09123456789/i);
    expect(phoneInput).toBeInTheDocument();

    // Type invalid phone number
    fireEvent.change(phoneInput, { target: { value: "123456" } });
    
    // Find the submit button
    const submitBtn = screen.getByText(/ارسال کد تایید/i);
    expect(submitBtn).toBeInTheDocument();

    // Click submit
    fireEvent.click(submitBtn);

    // Should display validation error
    const errorMsg = await screen.findByText(/شماره همراه باید با 09 شروع شده و ۱۱ رقم باشد/i);
    expect(errorMsg).toBeInTheDocument();
  });
});

describe("E2E React Tests - Product Creation (ProductForm)", () => {
  it("should render product creation form with fields", () => {
    render(
      <ProductForm
        editingProduct={null}
        unitId="unit123"
        ownerId="owner123"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Check key fields
    expect(screen.getByText(/نام محصول تولیدی/i)).toBeInTheDocument();
    expect(screen.getByText(/توضیحات، ابعاد یا مشخصات فنی محصول/i)).toBeInTheDocument();
    expect(screen.getByText(/حدود قیمت یا رنج قیمت/i)).toBeInTheDocument();
  });

  it("should show validation warning or error when fields are empty and submitted", async () => {
    const handleSave = vi.fn();
    render(
      <ProductForm
        editingProduct={null}
        unitId="unit123"
        ownerId="owner123"
        onSave={handleSave}
        onCancel={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /ذخیره کالا/i });
    expect(submitBtn).toBeInTheDocument();

    // Click submit
    fireEvent.click(submitBtn);

    // Saving shouldn't be called because the product name and image are empty
    expect(handleSave).not.toHaveBeenCalled();
  });
});
