--
-- PostgreSQL database dump
--

\restrict ptRBipuvikQMMkH7gfW7EU5TCYCEsemTUDBEDFmqWxA38vQSHyyem86HQQT1tyJ

-- Dumped from database version 14.22 (Ubuntu 14.22-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.22 (Ubuntu 14.22-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    menu_item_id integer,
    quantity integer
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer,
    restaurant_id integer,
    rider_id integer,
    total_amount double precision,
    status character varying,
    address character varying,
    items_summary character varying,
    created_at timestamp without time zone,
    merchant_id integer,
    special_instructions text,
    payment_method character varying DEFAULT 'Wallet'::character varying
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, menu_item_id, quantity) FROM stdin;
1	17	2	1
2	18	2	1
3	19	2	1
4	20	2	1
5	21	2	1
6	22	3	1
7	23	2	1
8	24	38	1
9	25	38	1
10	26	38	1
11	27	38	1
12	28	2	2
13	29	2	1
14	30	2	1
15	31	2	1
16	31	3	1
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, restaurant_id, rider_id, total_amount, status, address, items_summary, created_at, merchant_id, special_instructions, payment_method) FROM stdin;
16	4	1	\N	140	Cancelled_by_Merchant	206 sector 2 rk puram khadki 	1x veg thalli	2026-05-29 17:39:30.034964	2		Wallet
1	5	3	7	150	Delivered	COD Full	Pizza	2026-05-29 09:10:08.7997	6		COD
15	4	1	3	140	Picked Up	206 sector 2 rk puram khadki 	1x chole	2026-05-29 17:39:13.939858	2		Wallet
13	4	1	3	240	Picked Up	206 sector 2 rk puram khadki 	2x chole	2026-05-29 17:11:36.545441	2		UPI
2	4	1	3	140	Delivered	206 sector 2 rk puram khadki 	1x chole	2026-05-29 10:16:23.246205	2	make it extra spicy	UPI
11	4	1	3	140	Picked Up	206 sector 2 rk puram khadki 	1x chole	2026-05-29 16:14:06.630157	2		UPI
4	4	1	\N	540	Cancelled	206 sector 2 rk puram khadki 	chole bhature, chole bhature, chole, chole	2026-05-29 13:15:19.698081	2		Wallet
5	4	1	\N	140	Cancelled	206 sector 2 rk puram khadki 	chole	2026-05-29 13:16:20.011404	2		Wallet
10	4	1	3	2590	Picked Up	206 sector 2 rk puram khadki 	17x chole bhature	2026-05-29 15:12:36.867188	2		UPI
8	4	1	3	140	Picked Up	206 sector 2 rk puram khadki 	1x chole	2026-05-29 14:56:06.846502	2		UPI
6	4	1	3	340	Picked Up	206 sector 2 army quarters khadki	2x chole bhature	2026-05-29 13:58:07.960423	2		UPI
3	4	1	3	190	Picked Up	FC Road, Deccan Gymkhana, Pune, MH 411004	1x chole bhature	2026-05-29 12:03:14.71103	2		COD
7	4	1	3	290	Delivered	206 sector 2 army quarters khadki	1x chole, 1x chole bhature	2026-05-29 13:58:35.644037	2		UPI
9	4	1	\N	290	Cancelled_by_Merchant	206 sector 2 rk puram khadki 	1x Reorder Item	2026-05-29 14:56:53.348276	2		UPI
29	4	1	\N	190	Ready	206 sector 2 rk puram khadki 	1x chole bhature	2026-05-29 20:24:38.492024	2		COD
18	4	1	\N	190	Cancelled_by_Merchant	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	1x chole bhature	2026-05-29 19:00:08.541288	2		UPI
12	4	1	3	290	Delivered	206 sector 2 rk puram khadki 	1x chole, 1x chole bhature	2026-05-29 16:16:53.9662	2		UPI
14	4	1	\N	140	Cancelled_by_Merchant	206 sector 2 rk puram khadki 	1x chole	2026-05-29 17:13:38.61853	2		UPI
26	4	2	\N	3640	Ready	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	8x chicken dum biryani	2026-05-29 19:27:21.295017	2		UPI
19	4	1	\N	190	Ready	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	1x chole bhature	2026-05-29 19:01:48.447452	2		UPI
20	4	1	\N	490	Ready	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	3x chole bhature	2026-05-29 19:04:40.127415	2		UPI
21	4	1	\N	1840	Cancelled_by_Merchant	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	12x chole bhature	2026-05-29 19:05:32.947382	2		UPI
23	4	1	\N	190	Cancelled	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	1x chole bhature	2026-05-29 19:15:30.819211	2		UPI
24	4	2	\N	490	Ready	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	1x chicken dum biryani	2026-05-29 19:25:10.794813	2		UPI
17	4	1	3	190	Ready	206 sector 2 rk puram khadki 	1x chole bhature	2026-05-29 18:59:15.057443	2		UPI
25	4	2	3	1840	Picked Up	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	4x chicken dum biryani	2026-05-29 19:25:30.183077	2		UPI
27	4	2	3	9040	Delivered	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	20x chicken dum biryani	2026-05-29 19:33:56.253642	2		COD
22	4	1	3	140	Picked Up	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India	1x chole	2026-05-29 19:15:14.48429	2		UPI
28	4	1	\N	340	Cancelled_by_Merchant	206 sector 2 rk puram khadki 	2x chole bhature	2026-05-29 20:21:20.225103	2		COD
30	4	1	\N	190	Ready	206 sector 2 rk puram khadki 	1x chole bhature	2026-05-29 20:25:26.328669	2		COD
31	4	1	\N	290	Cancelled	206 sector 2 rk puram khadki 	1x chole bhature, 1x chole	2026-05-29 20:26:26.586826	2		COD
\.


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 16, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 31, true);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: ix_order_items_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_order_items_id ON public.order_items USING btree (id);


--
-- Name: ix_order_items_menu_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_order_items_menu_item_id ON public.order_items USING btree (menu_item_id);


--
-- Name: ix_orders_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_id ON public.orders USING btree (id);


--
-- Name: ix_orders_restaurant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_restaurant_id ON public.orders USING btree (restaurant_id);


--
-- Name: ix_orders_rider_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_rider_id ON public.orders USING btree (rider_id);


--
-- Name: ix_orders_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ptRBipuvikQMMkH7gfW7EU5TCYCEsemTUDBEDFmqWxA38vQSHyyem86HQQT1tyJ

