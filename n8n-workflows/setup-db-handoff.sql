-- ============================================
-- SCHEMA: Handoff Hub - WhatsApp
-- Ejecutar en tu PostgreSQL antes de activar el workflow
-- ============================================

CREATE TABLE IF NOT EXISTS conversaciones_handoff (
  numero_cliente    VARCHAR(20) PRIMARY KEY,
  nombre_cliente    VARCHAR(255),
  modo              VARCHAR(10) DEFAULT 'bot' CHECK (modo IN ('bot', 'humano')),
  contexto_bot      TEXT,
  motivo_handoff    TEXT,
  agente_asignado   VARCHAR(100),
  phone_number_id   VARCHAR(50),
  fecha_handoff     TIMESTAMP,
  fecha_cierre_handoff TIMESTAMP,
  ultimo_mensaje    TIMESTAMP DEFAULT NOW(),
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes_handoff (
  id                SERIAL PRIMARY KEY,
  numero_cliente    VARCHAR(20) NOT NULL,
  origen            VARCHAR(20) NOT NULL CHECK (origen IN ('cliente', 'agente', 'sistema')),
  mensaje           TEXT,
  phone_number_id   VARCHAR(50),
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_numero ON mensajes_handoff(numero_cliente);
CREATE INDEX IF NOT EXISTS idx_mensajes_fecha ON mensajes_handoff(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_modo ON conversaciones_handoff(modo);
