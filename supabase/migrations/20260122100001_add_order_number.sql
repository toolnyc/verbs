-- Add sequential order number for customer-facing order identification
ALTER TABLE orders ADD COLUMN order_number SERIAL;

-- Add index for quick lookup by order number
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Comment for clarity
COMMENT ON COLUMN orders.order_number IS 'Sequential order number for customer display and admin lookup';
