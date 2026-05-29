--
-- PostgreSQL database dump
--

\restrict DTem9q7goCYcpwMkatB3Yyziyz4KDntdkrbe63weGvPjYijNzgwpEKdhrVkFcVE

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
-- Name: address_book; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_book (
    id integer NOT NULL,
    user_id integer,
    address_text character varying
);


ALTER TABLE public.address_book OWNER TO postgres;

--
-- Name: address_book_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.address_book_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.address_book_id_seq OWNER TO postgres;

--
-- Name: address_book_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.address_book_id_seq OWNED BY public.address_book.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying,
    email character varying,
    password character varying,
    role character varying,
    wallet_balance double precision,
    phone_number character varying NOT NULL,
    vehicle_number character varying,
    employer_id integer,
    restaurant_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: address_book id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_book ALTER COLUMN id SET DEFAULT nextval('public.address_book_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: address_book; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address_book (id, user_id, address_text) FROM stdin;
1	4	206 sector 2 army quarters khadki
2	5	456 Home Lane
3	5	Closed test
4	5	1
5	5	2
6	5	3
7	5	4
8	5	5
9	5	6
10	5	7
11	5	8
12	5	9
13	5	10
14	5	11
15	5	12
16	5	13
17	5	14
18	5	15
19	5	Test
20	5	Pending Test
21	5	COD Test
22	5	Wallet Test
23	5	Wallet Complete
24	5	COD Full
25	4	206 sector 2 rk puram khadki 
26	4	FC Road, Deccan Gymkhana, Pune, MH 411004
27	4	Mandalay Lines, Khadki, Pune City Subdistrict, Pune District, Maharashtra, 411001, India
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, wallet_balance, phone_number, vehicle_number, employer_id, restaurant_id) FROM stdin;
5	Test User	test@example.com	$2b$12$vjlBV6Nl/RJdDOLA9/yeLuZLPSqNX420foFmglyjGTSR4SgktQGBG	Customer	1000.02	9876543210	\N	\N	\N
6	Merchant User	merchant@example.com	$2b$12$v3aFSWSF9Eqv3byXpS/k6OcajivMEns12jLLm1PQGdINHqFmlre8m	Merchant	369.99	9988776655	\N	\N	\N
7	Rider User	rider@example.com	$2b$12$WkDjgNLQsPVu4uEwxjqdZeakBmSMXZ1roj48zvYoa4.uOTcYOoIIK	Rider	80	9876543211	MH12AB1234	\N	\N
8	Staff User	staff@example.com	$2b$12$h5r9sXuWcx4B/vjlKsnDs.roP45bS4nRONAEzk10gZnLNOuM3HYXK	Customer	0	9998887776	\N	\N	\N
9	Staff2	staff2@example.com	$2b$12$K317WQsAqMZtTG.EJQ5VRO9KqvsfavIvL9Anv3IxM1hRp37H5n9Ca	Customer	0	9998887777	\N	\N	\N
1	Tushar Singh	cust3@test.com	$2b$12$V0kgj.jaxXHZjKFS0pqiAuLhuFiZzak/jbGxsaOFzfTQBujGwVh6W	Customer	500	9868052978	\N	\N	\N
13	harshad 	staff3@test.com	$2b$12$fHaDPENfOmtfrCKpi6lyAO20n6abaaXh2MLdK8THSAMLwYg3QOM3u	Staff	0	2345678965	\N	2	2
2	Ravi Kumar	rest@test.com	$2b$12$MmYttTIsIyaaqSlQ0tbjeeqEDnj4IwMI9GO6A/CRTYfLQVOoQ.2Eu	Merchant	14900	7890567890	\N	\N	\N
3	Yash Verma	rider@test.com	$2b$12$T8h0saXCUubhcDYvzKWKo.VAV6ewY9bVqrf8nihZp0JusKyglUdBm	Rider	200	6789054328	fgh456789	\N	\N
10	rahul	staff@test.com	$2b$12$FawYo6BCQkbZmjERb4z8kOgGusgIWzO70LHfT33FQVUCiHLCNLOeO	Customer	0	6789123456	\N	\N	\N
11	harshad	staff@gmail.com	$2b$12$/moN3USpzNJqdG7cwPKlD.YnRMR2/uU/VXrCBNhSQhgXr8ztyuMIK	Customer	0	1234567890	\N	\N	\N
12	harshad	staff1@test.com	$2b$12$8iKztD4OdeOlvYz2ipKARe.EwF.V5bx2Ebjlp56r5jSwDEd76FSN2	Customer	0	1234512345	\N	\N	\N
4	Tushar Singh	cust@test.com	$2b$12$iBgi8fk5.LHRmQQRGBCywOax6.Pfx6zF9rAdTayLfcIgalCgJBbBa	Customer	170	6789432156	\N	\N	\N
\.


--
-- Name: address_book_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.address_book_id_seq', 27, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 13, true);


--
-- Name: address_book address_book_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_book
    ADD CONSTRAINT address_book_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_address_book_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_address_book_id ON public.address_book USING btree (id);


--
-- Name: ix_address_book_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_address_book_user_id ON public.address_book USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_employer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_employer_id ON public.users USING btree (employer_id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- PostgreSQL database dump complete
--

\unrestrict DTem9q7goCYcpwMkatB3Yyziyz4KDntdkrbe63weGvPjYijNzgwpEKdhrVkFcVE

