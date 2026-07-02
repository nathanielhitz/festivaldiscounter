insert into festivals (id, slug, name, description, genres, city, venue, province, start_date, end_date, website_url, status, published) values
('11111111-1111-1111-1111-111111111101','lowlands','Lowlands',
 'Lowlands (voluit A Campingflight to Lowlands Paradise) is een van de grootste meerdaagse festivals van Nederland. Drie dagen lang muziek, kunst, wetenschap en theater op het evenemententerrein in Biddinghuizen, met campings direct naast het festivalterrein.',
 '{pop,rock,electronic,hiphop}','Biddinghuizen','Evenemententerrein Walibi Holland','Flevoland','2026-08-21','2026-08-23','https://lowlands.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111102','defqon-1','Defqon.1',
 'Defqon.1 Weekend Festival is het grootste hardstyle-festival ter wereld, georganiseerd door Q-dance. Vier dagen harder styles verdeeld over ruim vijftien podia, met camping, de iconische endshow en tienduizenden bezoekers uit de hele wereld.',
 '{hardstyle,hardcore}','Biddinghuizen','Evenemententerrein Walibi Holland','Flevoland','2026-06-26','2026-06-28','https://defqon1.nl','sold_out',true),
('11111111-1111-1111-1111-111111111103','awakenings-summer-festival','Awakenings Summer Festival',
 'Awakenings Summer Festival is hét techno-festival van Nederland. Een heel weekend lang draaien de grootste techno-artiesten van de wereld op meerdere podia in de bossen van Hilvarenbeek, inclusief camping.',
 '{techno}','Hilvarenbeek','Beekse Bergen','Noord-Brabant','2026-07-10','2026-07-12','https://awakenings.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111104','mysteryland','Mysteryland',
 'Mysteryland in Haarlemmermeer is het langstlopende dancefestival van Nederland. Op het voormalige Floriade-terrein komen alle stijlen van de elektronische muziek samen, van house en techno tot hardstyle.',
 '{house,techno,hardstyle}','Haarlemmermeer','Floriadeterrein','Noord-Holland','2026-08-28','2026-08-30','https://mysteryland.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111105','down-the-rabbit-hole','Down The Rabbit Hole',
 'Down The Rabbit Hole is een driedaags muziekfestival op de Groene Heuvels bij Ewijk, van de makers van Lowlands. Een eigenzinnige line-up met pop, rock, hiphop en electronic, midden in de natuur met camping.',
 '{pop,rock,hiphop}','Ewijk','De Groene Heuvels','Gelderland','2026-07-03','2026-07-05','https://downtherabbithole.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111106','pinkpop','Pinkpop',
 'Pinkpop in Landgraaf is het oudste jaarlijkse festival van Nederland en staat al decennia garant voor wereldsterren uit pop en rock op de Megaland-heuvel in Zuid-Limburg.',
 '{pop,rock}','Landgraaf','Megaland','Limburg','2026-06-19','2026-06-21','https://pinkpop.nl','tickets_live',true);

insert into ticket_offers (id, festival_id, provider, price_from, url, availability, last_checked_at) values
('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','official',260.00,'https://lowlands.nl/tickets','limited','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111101','ticketswap',240.00,'https://www.ticketswap.nl/event/lowlands-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111101','gigsberg',254.00,'https://www.gigsberg.com/lowlands-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111102','ticketswap',129.00,'https://www.ticketswap.nl/event/defqon-1-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222205','11111111-1111-1111-1111-111111111103','official',115.00,'https://awakenings.nl/tickets','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222206','11111111-1111-1111-1111-111111111104','official',62.00,'https://mysteryland.nl/tickets','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222207','11111111-1111-1111-1111-111111111105','ticketswap',205.00,'https://www.ticketswap.nl/event/down-the-rabbit-hole-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222208','11111111-1111-1111-1111-111111111106','official',110.00,'https://pinkpop.nl/tickets','available','2026-07-02T09:00:00Z');

insert into articles (slug, title, excerpt, content, seo_title, seo_description, published_at) values
('is-ticketswap-betrouwbaar','Is TicketSwap betrouwbaar? Zo werkt veilig tickets kopen',
 'TicketSwap is de grootste doorverkoopsite van Nederland. Zo koop je er veilig en herken je risico''s.',
 e'## Wat is TicketSwap?\n\nTicketSwap is een Nederlands platform waar particulieren festivaltickets doorverkopen. De maximale doorverkoopprijs is er begrensd op 120% van de originele prijs.\n\n## Zo blijft het veilig\n\n- **SecureSwap**: bij de meeste festivals wordt het ticket automatisch opnieuw uitgegeven op jouw naam, waardoor het oude ticket ongeldig wordt.\n- **Betaal nooit buiten het platform om.** Oplichters proberen je naar Marktplaats of Tikkie te lokken.\n- **Check de verkoper** en koop alleen tickets met het SecureSwap-label als dat beschikbaar is.\n\n## Wanneer liever officieel kopen?\n\nZolang de officiële verkoop open is en de prijs vergelijkbaar, koop je daar. Doorverkoop is vooral interessant bij uitverkochte festivals of last-minute prijsdalingen.',
 'Is TicketSwap betrouwbaar? Veilig festivaltickets kopen (2026)',
 'Is TicketSwap betrouwbaar? Lees hoe SecureSwap werkt, waar je op moet letten en wanneer je beter officieel kunt kopen.',
 '2026-07-02T08:00:00Z');
