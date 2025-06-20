﻿
# Backend - Express API

Este backend forma parte del sistema de gestión para paseadores de mascotas. Está construido con **Node.js**, **Express**, **Sequelize**, y utiliza **SQLite** como base de datos. Incluye autenticación JWT, manejo de imágenes, validación con middlewares y testeo con Jest + Supertest.

---

## Instalación

```bash
npm install
```

### Variables de entorno

Crear un archivo `.env` con el siguiente contenido:

```env
PORT=7070
JWT_SECRET=<tu_token_generado>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tuemail@gmail.com
SMTP_PASS=contraseña_de_aplicacion

TWILIO_ACCOUNT_SID=tu_account_sid_de_twilio
TWILIO_AUTH_TOKEN=tu_auth_token_de_twilio
TWILIO_PHONE_NUMBER=+569XXXXXXXX 
```

Para generar un JWT secreto:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Iniciar el servidor

```bash
npm run dev
```

---

## Comandos útiles

### Migraciones y seeds

```bash
# Crear base de datos y aplicar migraciones
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# Deshacer migraciones
npx sequelize-cli db:migrate:undo:all

# Reiniciar seeds
npx sequelize-cli db:seed:undo:all
npx sequelize-cli db:seed:all

# Eliminar y recrear todo desde cero
npx sequelize-cli db:drop
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

---

## Testing

```bash
npm run test
```

Utiliza **Jest** y **Supertest** para pruebas unitarias y de integración. Las pruebas están organizadas en `/tests*`.

---

## Estructura del proyecto

```
src/
│
├── config/              # Configuración general
├── controllers/         # Controladores de lógica de negocio
├── middlewares/         # Middlewares personalizados
├── migrations/          # Migraciones de Sequelize
├── models/              # Modelos de Sequelize
│   └── database/        # Definiciones de tablas
├── routes/              # Definición de endpoints
├── seeders/             # Definición de seeders
├── tests/               # Pruebas unitarias e integración
│   └── integration/     # Pruebas de integración
│   └── unit/            # Pruebas unitarias
├── utils/               # Funciones auxiliares y servicios externos
│   └── email/           # Envío de correos y SMS
└── app.js               # Punto de entrada del servidor
```

---

## Dependencias principales

```bash
# Core
npm install express cors morgan sequelize sqlite3 jsonwebtoken bcryptjs multer dotenv

# Email & servicios externos
npm install nodemailer twilio pdfkit dayjs

# Dev y herramientas
npm install --save-dev nodemon sequelize-cli jest supertest