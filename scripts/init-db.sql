-- ==============================================================================
-- ThinkCoffee Database Initialization
-- ==============================================================================

-- Create database if not exists (handled by POSTGRES_DB env var)
-- This script runs on first container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application schema
CREATE SCHEMA IF NOT EXISTS app;

-- Users and authentication
CREATE TABLE IF NOT EXISTS app.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coffee products
CREATE TABLE IF NOT EXISTS app.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS app.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS app.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent conversations and context
CREATE TABLE IF NOT EXISTS app.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    agent_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent messages
CREATE TABLE IF NOT EXISTS app.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES app.conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS app.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON app.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON app.users(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON app.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON app.products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON app.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON app.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON app.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON app.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON app.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON app.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_type ON app.conversations(agent_type);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON app.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON app.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON app.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON app.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON app.audit_log(created_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_search ON app.products 
    USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON app.users 
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON app.products 
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON app.orders 
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON app.conversations 
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at_column();

-- Seed data for development
INSERT INTO app.users (email, password_hash, name, role, email_verified) VALUES
    ('admin@thinkcoffee.com', '$2b$10$dummy.hash.for.development', 'Admin User', 'admin', true),
    ('manager@thinkcoffee.com', '$2b$10$dummy.hash.for.development', 'Manager User', 'manager', true),
    ('user@thinkcoffee.com', '$2b$10$dummy.hash.for.development', 'Regular User', 'user', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO app.products (name, description, category, price, stock_quantity, is_active) VALUES
    ('Espresso Tradicional', 'Café espresso clássico preparado na hora', 'Espresso', 3.50, 100, true),
    ('Cappuccino', 'Espresso com leite vaporizado e espuma cremosa', 'Cappuccino', 4.80, 100, true),
    ('Café Americano', 'Espresso diluído em água quente', 'Americano', 3.80, 100, true),
    ('Latte', 'Espresso com muito leite vaporizado e pouca espuma', 'Latte', 5.20, 100, true),
    ('Mocha', 'Espresso com chocolate e leite vaporizado', 'Especiais', 5.80, 100, true)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA app TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO PUBLIC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'ThinkCoffee database initialized successfully!';
END $$;