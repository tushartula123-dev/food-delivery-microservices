--
-- PostgreSQL database dump
--

\restrict hZy7NhZJU7OYeF4djFpD9JCNdjxRoNMjUAGicH7HhvMHqPvNebQrVFDGNLfanGT

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
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    restaurant_id integer,
    name character varying,
    price double precision,
    description character varying,
    is_available boolean,
    image_url character varying,
    is_veg boolean DEFAULT true,
    max_active_orders integer,
    max_queue_length integer
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.menu_items_id_seq OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurants (
    id integer NOT NULL,
    merchant_id integer,
    name character varying,
    address character varying,
    is_open boolean DEFAULT true,
    auto_accept boolean DEFAULT false,
    max_active_orders integer DEFAULT 10,
    max_queue_length integer DEFAULT 5,
    phone_number character varying
);


ALTER TABLE public.restaurants OWNER TO postgres;

--
-- Name: restaurants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.restaurants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.restaurants_id_seq OWNER TO postgres;

--
-- Name: restaurants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.restaurants_id_seq OWNED BY public.restaurants.id;


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: restaurants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants ALTER COLUMN id SET DEFAULT nextval('public.restaurants_id_seq'::regclass);


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, restaurant_id, name, price, description, is_available, image_url, is_veg, max_active_orders, max_queue_length) FROM stdin;
3	1	chole	100	HOT SPICY CHOLE WITH KULCHE	t	https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3clIbsi_nwfPmMETb7dvnZDI07BKsvRhKnQ&s	t	\N	\N
5	1	veg thalli	100	delicious for one person full plate veg thali	t	https://b.zmtcdn.com/data/dish_photos/94c/d664afc8b10cccf8ee72acbd958d494c.jpg	t	\N	\N
38	2	chicken dum biryani	450	spicy chicken dum biryani with one leg piece	t	https://c.ndtvimg.com/2020-12/gsb6apq_biryani_625x300_23_December_20.jpg	f	10	10
2	1	chole bhature	150	hot and soft bhature	t	https://cdn.uengage.io/uploads/28289/image-674446-1746179354.jpeg	t	5	5
\.


--
-- Data for Name: restaurants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.restaurants (id, merchant_id, name, address, is_open, auto_accept, max_active_orders, max_queue_length, phone_number) FROM stdin;
1	2	Rajinder Da dhaba	Pune, Maharashtra	t	f	1	1	87654789
2	2	biryani life	Pune, Maharashtra	t	f	100	100	\N
\.


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 38, true);


--
-- Name: restaurants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.restaurants_id_seq', 3, true);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: ix_menu_items_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_menu_items_id ON public.menu_items USING btree (id);


--
-- Name: ix_menu_items_restaurant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_menu_items_restaurant_id ON public.menu_items USING btree (restaurant_id);


--
-- Name: ix_restaurants_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_restaurants_id ON public.restaurants USING btree (id);


--
-- Name: ix_restaurants_merchant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_restaurants_merchant_id ON public.restaurants USING btree (merchant_id);


--
-- Name: ix_restaurants_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_restaurants_name ON public.restaurants USING btree (name);


--
-- PostgreSQL database dump complete
--

\unrestrict hZy7NhZJU7OYeF4djFpD9JCNdjxRoNMjUAGicH7HhvMHqPvNebQrVFDGNLfanGT

