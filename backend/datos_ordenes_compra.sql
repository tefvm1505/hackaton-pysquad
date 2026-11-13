-- Datos de prueba, parte 2 de 2: órdenes de compra y sus ítems.
--
-- Cargar DESPUÉS de las migraciones de Alembic y de datos_prueba.sql (las órdenes referencian a los
-- contratos CT-01, CT-03, CT-04, CT-06 y CT-07, que tienen que existir).
--
-- Cada orden está pensada para que la factura que se suba contra ella quede correcta: los ítems suman
-- el subtotal, el IVA es el 19 %, el NIT es el del contrato y ningún precio supera la tarifa pactada.
SET NAMES utf8mb4;
START TRANSACTION;

-- TABLA: ordenes_compra (cabeceras)
INSERT INTO ordenes_compra (id, numero_orden, id_contrato, fecha_emision, fecha_esperada, estado, nit_emisor, subtotal, iva, total) VALUES
-- Factura F01: contrato activo, montos correctos.
(1, 'OC-1003', 'CT-01', '2026-10-09 08:00:00', '2026-10-12 17:00:00', 'RECIBIDA', '900123456-8', 5120000.00, 972800.00, 6092800.00),
-- Factura F03: contrato CT-03. El total de la factura (17.612.000) cuadra EXACTO con el tope trimestral del contrato.
(2, 'OC-1005', 'CT-03', '2026-10-25 08:00:00', '2026-10-28 17:00:00', 'RECIBIDA', '800765432-3', 14800000.00, 2812000.00, 17612000.00),
-- Factura F04: contrato CT-04. El monto (11.900.000) cuadra EXACTO con el tope mensual.
(3, 'OC-1006', 'CT-04', '2026-10-27 08:00:00', '2026-10-30 17:00:00', 'RECIBIDA', '900456789-4', 10000000.00, 1900000.00, 11900000.00),
-- Factura F11: contrato CT-06 (acumulado). Montos y fechas vigentes.
(4, 'OC-1010', 'CT-06', '2026-10-24 08:00:00', '2026-10-27 17:00:00', 'RECIBIDA', '890321654-3', 1050000.00, 199500.00, 1249500.00),
-- Factura F21: contrato CT-07. El monto (5.355.000) cuadra EXACTO con el tope trimestral
-- (las facturas F05 y F20 de este contrato estaban mal por pasarse del tope).
(5, 'OC-1020', 'CT-07', '2026-10-15 08:00:00', '2026-10-20 17:00:00', 'RECIBIDA', '900987654-7', 4500000.00, 855000.00, 5355000.00);

-- TABLA: items_orden_compra (detalle de productos)
INSERT INTO items_orden_compra (id, orden_id, descripcion, cantidad, precio_unitario, total) VALUES
-- OC-1003 (F01)
(1, 1, 'Resma papel carta 75g', 200, 14500.00, 2900000.00),
(2, 1, 'Tóner HP 83A', 12, 185000.00, 2220000.00),
-- OC-1005 (F03)
(3, 2, 'Transporte Cali-Bogotá (viaje)', 8, 1850000.00, 14800000.00),
-- OC-1006 (F04)
(4, 3, 'Hora de consultoría NIIF', 40, 250000.00, 10000000.00),
-- OC-1010 (F11)
(5, 4, 'Carpeta legajadora oficio', 300, 3500.00, 1050000.00),
-- OC-1020 (F21)
(6, 5, 'Router empresarial Cisco', 3, 1500000.00, 4500000.00);

COMMIT;
