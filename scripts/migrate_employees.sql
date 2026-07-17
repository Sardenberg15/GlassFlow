-- Migration: Create Employee Management Tables
-- Run this against your PostgreSQL database

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  birth_date TEXT,
  role TEXT,
  contract_type TEXT NOT NULL DEFAULT 'clt',
  admission_date TEXT,
  termination_date TEXT,
  base_salary NUMERIC(10, 2),
  daily_rate NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'ativo',
  observations TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  pix_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  date TEXT NOT NULL,
  reference_month TEXT,
  project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_productivity (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  hours_worked NUMERIC(5, 2),
  description TEXT,
  rating INTEGER,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
