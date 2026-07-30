# Configuración Handoff Hub - WhatsApp

## 1. Variables de entorno en n8n

Configurar estas variables en **Settings > Environment Variables** en n8n:

| Variable | Valor | Dónde obtenerlo |
|----------|-------|-----------------|
| `WHATSAPP_ACCESS_TOKEN` | Token permanente de la API | Meta Business > App > WhatsApp > API Setup > Permanent token |
| `CRM_BASE_URL` | `https://crm.conecta.insignia.com.py` | Tu URL del CRM |
| `CRM_WEBHOOK_SECRET` | Un string secreto compartido | Generalo vos (ej: `openssl rand -hex 32`) |

## 2. Credencial PostgreSQL en n8n

En n8n ir a **Credentials > New > PostgreSQL** y crear con los datos de tu DB.
Luego reemplazar `TU_CREDENTIAL_ID` en todos los nodos Postgres del workflow.

## 3. SQL - Crear tablas

Ejecutar el archivo `setup-db-handoff.sql` en tu PostgreSQL.

## 4. Webhooks generados (URLs de n8n)

Después de importar y activar el workflow, n8n genera estas URLs:

| Webhook | Método | Quién lo llama |
|---------|--------|----------------|
| `/webhook/whatsapp-handoff` | POST | Meta (configurar en Facebook App) |
| `/webhook/whatsapp-enviar-respuesta` | POST | Tu CRM (cuando el agente responde) |
| `/webhook/whatsapp-cerrar-handoff` | POST | Tu CRM (cuando el agente cierra) |
| `/webhook/whatsapp-activar-handoff` | POST | Tu CRM (para forzar handoff manual) |

## 5. Configurar Meta Webhook

En **Meta Business > App > WhatsApp > Configuration > Webhook**:
- Callback URL: `https://TU-N8N.com/webhook/whatsapp-handoff`
- Verify token: El mismo que uses en el webhook
- Suscribir a: `messages`

## 6. Endpoints que tu CRM debe llamar

### Enviar respuesta del agente al cliente
```
POST /webhook/whatsapp-enviar-respuesta
{
  "numero": "595981123456",
  "mensaje": "Hola, soy el agente. ¿En qué te puedo ayudar?",
  "phone_number_id": "123456789",
  "agente_nombre": "María"
}
```

### Activar handoff manual (bot → humano)
```
POST /webhook/whatsapp-activar-handoff
{
  "numero": "595981123456",
  "phone_number_id": "123456789",
  "motivo": "Bot no pudo resolver consulta técnica",
  "agente_asignado": "carlos@insignia.com",
  "enviar_aviso": true
}
```

### Cerrar handoff (humano → bot)
```
POST /webhook/whatsapp-cerrar-handoff
{
  "numero": "595981123456",
  "phone_number_id": "123456789",
  "agente_nombre": "María",
  "mensaje_cierre": "Fue un gusto ayudarte. El asistente virtual queda a tu disposición.",
  "enviar_mensaje_cierre": true
}
```

### Webhook que n8n envía a tu CRM (notificaciones)

#### Mensaje entrante (modo humano)
```
POST /api/webhook/mensaje-entrante
Headers: x-webhook-secret: TU_SECRET
{
  "numero": "595981123456",
  "nombre": "Juan Pérez",
  "mensaje": "Hola necesito ayuda",
  "timestamp": "1716825600",
  "origen": "cliente",
  "phone_number_id": "123456789"
}
```

#### Handoff nuevo (notificación al agente)
```
POST /api/webhook/handoff-nuevo
Headers: x-webhook-secret: TU_SECRET
{
  "tipo": "handoff_nuevo",
  "numero": "595981123456",
  "nombre": "Juan Pérez",
  "ultimo_mensaje": "Quiero hablar con un agente",
  "motivo": "Solicitado por cliente",
  "phone_number_id": "123456789",
  "timestamp": "1716825600"
}
```
