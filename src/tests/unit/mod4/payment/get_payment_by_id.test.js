/**
 * @file payment_controller.test.js
 * @module mod1 - Gestión de Pagos
 * @description Pruebas unitarias para la función `get_payment_by_id`
 *
 * Casos de prueba cubiertos:
 * 1. ID de pago inválido (400)
 * 2. Pago no encontrado (404)
 * 3. Admin puede ver cualquier pago (200)
 * 4. Cliente puede ver sus pagos (200)
 * 5. Paseador puede ver sus pagos (200)
 * 6. Usuario no autorizado (403)
 * 7. Error interno del servidor (500)
 *
 */

const { get_payment_by_id } = require("../../../../controllers/payment_controller");
const { payment, walk, user } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
    payment: {
        findByPk: jest.fn(),
    },
    walk: {},
    user: {}
}));

describe("get_payment_by_id", () => {
    const buildReq = (overrides = {}) => ({
        params: { id: "1", ...overrides.params },
        user: { role_id: 1, user_id: 1, ...overrides.user } // admin por defecto
    });

    const buildRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    const mockPayment = {
        payment_id: 1,
        amount: 10000,
        status: "pagado",
        walk: {
            client_id: 1,
            walker_id: 2,
            client: { email: "client@example.com" },
            walker: { email: "walker@example.com" }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. ID de pago inválido (400)
    test("retorna 400 si el ID es inválido", async () => {
        const req = buildReq({ params: { id: "abc" } });
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: true,
            msg: "ID de pago inválido"
        });
    });

    // 2. Pago no encontrado (404)
    test("retorna 404 si el pago no existe", async () => {
        payment.findByPk.mockResolvedValue(null);
        const req = buildReq();
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(payment.findByPk).toHaveBeenCalledWith("1", {
        include: [
            {
                model: walk,
                as: "walk",
                include: [
                    { model: user, as: "client", attributes: ["email"] },
                    { model: user, as: "walker", attributes: ["email"] }
                ]
            }
        ]
    });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: true,
            msg: "Pago no encontrado"
        });
    });

    // 3. Admin puede ver cualquier pago (200)
    test("retorna el pago cuando el usuario es admin", async () => {
        payment.findByPk.mockResolvedValue(mockPayment);
        const req = buildReq({ user: { role_id: 1, user_id: 999 } }); // admin con ID diferente
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(res.json).toHaveBeenCalledWith({
            msg: "Pago obtenido",
            data: mockPayment,
            error: false
        });
    });

    // 4. Cliente puede ver sus pagos (200)
    test("retorna el pago cuando el cliente es el dueño", async () => {
        payment.findByPk.mockResolvedValue(mockPayment);
        const req = buildReq({ user: { role_id: 3, user_id: 1 } }); // cliente dueño (client_id = 1)
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(res.json).toHaveBeenCalledWith({
            msg: "Pago obtenido",
            data: mockPayment,
            error: false
        });
    });

    // 5. Paseador puede ver sus pagos (200)
    test("retorna el pago cuando el paseador está asignado", async () => {
        payment.findByPk.mockResolvedValue(mockPayment);
        const req = buildReq({ user: { role_id: 2, user_id: 2 } }); // paseador asignado (walker_id = 2)
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(res.json).toHaveBeenCalledWith({
            msg: "Pago obtenido",
            data: mockPayment,
            error: false
        });
    });

    // 6. Usuario no autorizado (403)
    test("retorna 403 cuando el usuario no tiene permisos", async () => {
        payment.findByPk.mockResolvedValue(mockPayment);
        const req = buildReq({ user: { role_id: 3, user_id: 999 } }); // cliente no dueño
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            error: true,
            msg: "No tienes permiso para ver este pago"
        });
    });

    // 7. Error interno del servidor (500)
    test("retorna 500 si ocurre un error en la base de datos", async () => {
        const originalConsole = console.error;
        console.error = jest.fn();

        payment.findByPk.mockRejectedValue(new Error("Database error"));
        const req = buildReq();
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            msg: "Error al obtener el pago",
            error: true
        });
        expect(console.error).toHaveBeenCalledWith(
            "Error en get_payment_by_id:",
            expect.any(Error)
        );

        console.error = originalConsole;
    });

    // 8. Caso borde: pago sin walk asociado
    test("maneja correctamente pagos sin walk asociado", async () => {
        const paymentWithoutWalk = {
            payment_id: 2,
            amount: 5000,
            status: "pendiente",
            walk: null
        };
        payment.findByPk.mockResolvedValue(paymentWithoutWalk);
        const req = buildReq();
        const res = buildRes();

        await get_payment_by_id(req, res);

        expect(res.status).toHaveBeenCalledWith(403); // No debería tener acceso
    });
});