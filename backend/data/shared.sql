BEGIN TRANSACTION;
CREATE TABLE alembic_version (
	version_num VARCHAR(32) NOT NULL, 
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO "alembic_version" VALUES('0008');
CREATE TABLE allocation_notices (
	message_id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	items JSON NOT NULL, 
	CONSTRAINT pk_allocation_notices PRIMARY KEY (message_id), 
	CONSTRAINT fk_allocation_notices_message_id_partner_messages FOREIGN KEY(message_id) REFERENCES partner_messages (id) ON DELETE CASCADE, 
	CONSTRAINT fk_allocation_notices_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE
);
INSERT INTO "allocation_notices" VALUES('f2932d55d1814a23b12cbaa6dfe1e2d7','d4074ba1840641cd9eba63433361191d','[{"id": "00aeb310-00d5-4adf-ac85-1e0d5ba85c96", "name": "Vegetable pulao", "diet": "VEG", "servings": 30}]');
INSERT INTO "allocation_notices" VALUES('2057c6ef1d434f7a8da0622be1e74ce0','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('cb8770a489154a6ca637c838c29ffd3a','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('55b130ef97234348bf612df98353e18a','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('0900efe3f7b741a09d4f8c7fff1c1d20','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('190ce37f7893471f8b2f5bdf453c3b02','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('0e004085707a40448315da44b01838c1','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('f7e8b3d987f943289864b6828969ca2e','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('73344faca5f44bdbaa56948235dc21e1','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('30e4a4c7ae2b470ebf0a3a5787ced167','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('245109d5bc5747d8ac978223b708313a','a0c004756f244f9a8a64332d51962f7b','[{"id": "3e02799c-d823-44c8-a222-54f2df3ce72d", "name": "Chapati with Curry", "diet": "VEG", "servings": 5}]');
INSERT INTO "allocation_notices" VALUES('e5d1321ba2964c12b2b51d857d6a7114','a55f092cb918462ba6461fea6102f7bb','[{"id": "90ce3824-9f1a-41d5-a220-7e10fadd6e0e", "name": "Vegetable pulao", "diet": "VEG", "servings": 30}]');
CREATE TABLE chat_messages (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	sender_org_id CHAR(32) NOT NULL, 
	sender_name VARCHAR(200) NOT NULL, 
	sender_role VARCHAR(16) NOT NULL, 
	message TEXT NOT NULL, 
	is_suggested BOOLEAN NOT NULL, 
	created_at DATETIME NOT NULL, offer_id CHAR(32), 
	CONSTRAINT pk_chat_messages PRIMARY KEY (id), 
	CONSTRAINT fk_chat_messages_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE, 
	CONSTRAINT fk_chat_messages_sender_org_id_organizations FOREIGN KEY(sender_org_id) REFERENCES organizations (id) ON DELETE CASCADE
);
INSERT INTO "chat_messages" VALUES('96635f54ee4f43c7960f8097f47e2aba','d4d8ced75f3c43bf90478b349b3a646b','673c50c006ae477cbf99ec6ab6b6e181','Demo Donor','DONOR','Thank you for reaching the community!',0,'2026-11-22 12:05:08.747539','1bc8e00406de4a47bfba6319a9c1e618');
CREATE TABLE donation_recognitions (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	receiver_organization_id CHAR(32) NOT NULL, 
	issued_by_user_id CHAR(32) NOT NULL, 
	public_token CHAR(32) NOT NULL, 
	people_served INTEGER, 
	food_rating INTEGER, 
	message VARCHAR(280) NOT NULL, 
	donor_name VARCHAR(200) NOT NULL, 
	receiver_name VARCHAR(200) NOT NULL, 
	issued_at DATETIME NOT NULL, 
	withdrawn_at DATETIME, 
	CONSTRAINT pk_donation_recognitions PRIMARY KEY (id), 
	CONSTRAINT ck_donation_recognitions_recognition_people_nonnegative CHECK (people_served IS NULL OR people_served >= 0), 
	CONSTRAINT ck_donation_recognitions_recognition_rating_range CHECK (food_rating IS NULL OR food_rating BETWEEN 1 AND 5), 
	CONSTRAINT uq_donation_recognitions_rescue_id UNIQUE (rescue_id), 
	CONSTRAINT fk_donation_recognitions_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id), 
	CONSTRAINT fk_donation_recognitions_receiver_organization_id_organizations FOREIGN KEY(receiver_organization_id) REFERENCES organizations (id), 
	CONSTRAINT fk_donation_recognitions_issued_by_user_id_users FOREIGN KEY(issued_by_user_id) REFERENCES users (id), 
	CONSTRAINT uq_donation_recognitions_public_token UNIQUE (public_token)
);
INSERT INTO "donation_recognitions" VALUES('e904e3af388743d88f9cc7a0bf34537a','d4d8ced75f3c43bf90478b349b3a646b','a4146f8b68484ee8a23f2b0620e0a01a','235c5679a2ce40458ad9616f9ffa0116','654e4f4c8f7a4acebcc2049a3a725721',22,5,'Your donation helped us share a warm meal with our community today. Thank you for making this handoff possible.','Madhapur Grand Events','City Food Relief','2026-11-22 05:04:51.526758',NULL);
INSERT INTO "donation_recognitions" VALUES('21a4b2adc6e1400aaf76471269bbe18e','aafbb036e0214637b88d0a38f3dfd428','36fdcae7731549b0886f2c14ebb9a0c3','331b096f76204366b7c76c0711e95066','92272359e29b495abee8176170864e4e',95,5,'Thank you for sharing 95 servings with our community.','Madhapur Grand Events','Hope Community Kitchen','2026-10-25 12:21:49.469152',NULL);
INSERT INTO "donation_recognitions" VALUES('5f215d9ce0dc415e987255bc61bcf4e9','f063e8f9e0cc4dee9544d027d2d14e6c','08e1b365dfad466eb1144fa87d2e5f1d','54b7835b8f354ad49a61ac99b80d7b5f','62c264ec6d734265a3150e0185a141be',76,5,'Thank you for sharing 76 servings with our community.','Jubilee Hills Caterers','ShelterServe','2026-10-26 12:41:49.481371',NULL);
INSERT INTO "donation_recognitions" VALUES('9e02e2b077674a0d8f00f7b1e1ac354b','2c3a19aa6c9c4c34bd5f44521e5f2b90','a4146f8b68484ee8a23f2b0620e0a01a','235c5679a2ce40458ad9616f9ffa0116','521d3ae66a554cec869688afdd0ec269',114,5,'Thank you for sharing 114 servings with our community.','Banjara Feasts','City Food Relief','2026-10-28 12:52:49.497336',NULL);
INSERT INTO "donation_recognitions" VALUES('593c245aa65447328df3b9961bc01b47','71eac25bd95c4d38be8866954656f368','e4fbc4a588454cdd83711151fb9459c0','0828d25b5b3c4e5a87d80b44a6dc8eaf','57e7de71c4a1420980f77eaa48e88591',85,4,'Thank you for sharing 85 servings with our community.','Madhapur Grand Events','Sunrise NGO','2026-10-29 12:36:49.499343',NULL);
INSERT INTO "donation_recognitions" VALUES('dc8ccf0810744f63a6604b0762f057e0','63764a16a2f94f5985b0f241c64e49a2','28635142d2844fedb3f47adfce28d119','d30a9ea1e0b64f278a9c787b6bae0846','28271fdeff9b48d1a03513806c8d980b',142,4,'Thank you for sharing 142 servings with our community.','Jubilee Hills Caterers','Helping Hands','2026-10-31 12:24:49.505105',NULL);
INSERT INTO "donation_recognitions" VALUES('f54437b383b54a91949b4fce2e50f4f7','0a956c9afa1e4eca94660d9979dc7246','36fdcae7731549b0886f2c14ebb9a0c3','331b096f76204366b7c76c0711e95066','78b0dcbd4a924f3aa6fd590691a4e342',66,4,'Thank you for sharing 66 servings with our community.','Hitech Banquets & Events','Hope Community Kitchen','2026-11-01 12:47:49.509118',NULL);
INSERT INTO "donation_recognitions" VALUES('5464351bb17a4718b860b3d7751c823c','2b05e25f288343f7bde09a8b72e1f726','54c2130198874229a973ad62c6a35a1a','603977c2cf6d4190a7d1574cca1eac4e','62fc9210cbed44028dc39bf92cb6f4f2',104,4,'Thank you for sharing 104 servings with our community.','Kukatpally Wedding Hall','Green Table Kitchen','2026-11-03 12:34:49.513130',NULL);
INSERT INTO "donation_recognitions" VALUES('649af6f4b64f4b2dad253abf51953beb','88430e8bbb51485cbd71e367b36289b3','08e1b365dfad466eb1144fa87d2e5f1d','54b7835b8f354ad49a61ac99b80d7b5f','14aaa7651f214a2799020487435bca1c',80,4,'Thank you for sharing 80 servings with our community.','Secunderabad Palace Catr.','ShelterServe','2026-11-04 12:20:49.516884',NULL);
INSERT INTO "donation_recognitions" VALUES('2c5dd8b29890456fa170e4bbf02dfec2','df2433d620b24fd88c0e4e500fda458f','82664df4c38a4992a43a3a3f2c2e1510','38236d5996f7445e9cfe99d65999c48a','04493e11317d4e46985f3f05efea4668',190,5,'Thank you for sharing 190 servings with our community.','Madhapur Grand Events','Asha Kiran Shelter','2026-11-05 12:32:49.520898',NULL);
INSERT INTO "donation_recognitions" VALUES('11ea275eaa0a4f2fbe059a611de4bca4','1d5891c2c4654266beba13c7989e001e','68d758aaea3c4df79b44c900ac9b9d8e','586621ca36d04e1583aa39309e1fdcd1','60d24294b0f94e9d993ae93985f1cdc7',90,4,'Thank you for sharing 90 servings with our community.','Jubilee Hills Caterers','Roti Bank Hyderabad','2026-11-07 12:29:49.524911',NULL);
INSERT INTO "donation_recognitions" VALUES('80c90908bc8646d29832b55034cfbcfd','5565127f2537483cb39250cd198c3f9e','36fdcae7731549b0886f2c14ebb9a0c3','331b096f76204366b7c76c0711e95066','8a628590ffea4ea1aa615c641449b6fa',123,4,'Thank you for sharing 123 servings with our community.','Hitech Banquets & Events','Hope Community Kitchen','2026-11-08 12:35:49.526917',NULL);
INSERT INTO "donation_recognitions" VALUES('7a9c7504ac6e464383af6668a957f2ad','f12adf187e304159b93bbeea47bd61f1','a4146f8b68484ee8a23f2b0620e0a01a','235c5679a2ce40458ad9616f9ffa0116','d0e0ed81dda5484c8dbf119573da0700',95,5,'Thank you for sharing 95 servings with our community.','Kondapur Catering Co.','City Food Relief','2026-11-09 12:18:49.528924',NULL);
INSERT INTO "donation_recognitions" VALUES('967942fdcba945ff972b8f26f1aa87c8','6670de0672d94e6e82cd6771f40ce080','e4fbc4a588454cdd83711151fb9459c0','0828d25b5b3c4e5a87d80b44a6dc8eaf','7b33df0ed8e74e689ebc8f3a83c85084',152,5,'Thank you for sharing 152 servings with our community.','Kukatpally Wedding Hall','Sunrise NGO','2026-11-11 12:22:49.536794',NULL);
INSERT INTO "donation_recognitions" VALUES('68ef8f36e0ce4d19a0b5cfb9c199885e','7205a4ca36624411aea13209c774cc61','28635142d2844fedb3f47adfce28d119','d30a9ea1e0b64f278a9c787b6bae0846','647a92120f55457093449f954fd05f46',85,4,'Thank you for sharing 85 servings with our community.','Secunderabad Palace Catr.','Helping Hands','2026-11-12 12:51:49.540804',NULL);
INSERT INTO "donation_recognitions" VALUES('2546b19b9cb447718beeb58782d00f8b','e7121c3b44904ba59303f3e8dd767e4b','54c2130198874229a973ad62c6a35a1a','603977c2cf6d4190a7d1574cca1eac4e','c50e707b2daa42168eef63594b1d17e0',104,4,'Thank you for sharing 104 servings with our community.','Madhapur Grand Events','Green Table Kitchen','2026-11-13 12:30:49.544633',NULL);
INSERT INTO "donation_recognitions" VALUES('7f52ae47a49f41229d7e48884872cd00','d11a83cbba4543a4810d8adf5d3980df','82664df4c38a4992a43a3a3f2c2e1510','38236d5996f7445e9cfe99d65999c48a','b389f07232074179a600f444e8166375',171,5,'Thank you for sharing 171 servings with our community.','Hitech Banquets & Events','Asha Kiran Shelter','2026-11-15 12:34:49.548648',NULL);
INSERT INTO "donation_recognitions" VALUES('d5d9abfe241d4a64a0a7a2cefce6635f','d98dd7a0d2394bd3bea09cf868f0a500','68d758aaea3c4df79b44c900ac9b9d8e','586621ca36d04e1583aa39309e1fdcd1','f629f514323a46b6b5d07ef5d6325fcc',90,4,'Thank you for sharing 90 servings with our community.','Banjara Feasts','Roti Bank Hyderabad','2026-11-16 12:34:49.553584',NULL);
INSERT INTO "donation_recognitions" VALUES('474470cb53804ab6abb9e81042049b42','7412580afaa94eecb1829e2b084c94d6','36fdcae7731549b0886f2c14ebb9a0c3','331b096f76204366b7c76c0711e95066','149bbe33d48b4f2189fa1ea1601f6131',114,5,'Thank you for sharing 114 servings with our community.','Kondapur Catering Co.','Hope Community Kitchen','2026-11-17 12:32:49.553584',NULL);
INSERT INTO "donation_recognitions" VALUES('50d4f10773544c3a8de3943c53d2e290','b9bfa897a1a5432daa69cfa7d5e3fc77','08e1b365dfad466eb1144fa87d2e5f1d','54b7835b8f354ad49a61ac99b80d7b5f','7890c7cb0dab41b8958697ae88baca5a',80,4,'Thank you for sharing 80 servings with our community.','Gachibowli Events Hub','ShelterServe','2026-11-18 12:39:49.553584',NULL);
INSERT INTO "donation_recognitions" VALUES('6fad28b1aefe4ea1b14edc52845e367a','fbd531e93ce143ea8c93014225d36840','a4146f8b68484ee8a23f2b0620e0a01a','235c5679a2ce40458ad9616f9ffa0116','bd1095ab676248289c5b41308df34338',133,5,'Thank you for sharing 133 servings with our community.','Secunderabad Palace Catr.','City Food Relief','2026-11-20 12:26:49.568142',NULL);
INSERT INTO "donation_recognitions" VALUES('10ed55d98bc24838987d1e4ee14a9e3b','e2431930941047acabafa75d5916eb99','e4fbc4a588454cdd83711151fb9459c0','0828d25b5b3c4e5a87d80b44a6dc8eaf','2f928e7717d449a796fd58412e46e0c0',95,5,'Thank you for sharing 95 servings with our community.','Madhapur Grand Events','Sunrise NGO','2026-11-21 00:13:49.570625',NULL);
INSERT INTO "donation_recognitions" VALUES('7391bdc5f7374ea880bc3051b934f376','be65a257723947b586cd3fe47a0c08e1','28635142d2844fedb3f47adfce28d119','d30a9ea1e0b64f278a9c787b6bae0846','2fc286cb0e0d4256a6244f8d6ba8892a',71,4,'Thank you for sharing 71 servings with our community.','Jubilee Hills Caterers','Helping Hands','2026-11-21 12:30:49.573205',NULL);
INSERT INTO "donation_recognitions" VALUES('e40bd4e9be3f4b2583f77c005bedd794','20466b025596421289b38aab49db7e9f','54c2130198874229a973ad62c6a35a1a','603977c2cf6d4190a7d1574cca1eac4e','9ccd6d6ad00e4b618c54a0cf8ea41e87',85,4,'Thank you for sharing 85 servings with our community.','Hitech Banquets & Events','Green Table Kitchen','2026-11-22 00:29:49.573205',NULL);
INSERT INTO "donation_recognitions" VALUES('6a7b648a220f421dbdd4b9bbdc3597c3','6b041b6fd63041359ae80d0bfa255cbf','36fdcae7731549b0886f2c14ebb9a0c3','331b096f76204366b7c76c0711e95066','7b8bb5a3a8fb404da719ffb8cc7c3366',68,4,'Thank you for sharing 68 servings with our community.','Lakeview Kitchen','Hope Community Kitchen','2026-10-26 14:40:36.793862',NULL);
INSERT INTO "donation_recognitions" VALUES('536bebae016449f58b035cebd0135d89','73492940f9f04e1b83969e60d0ed741f','e4fbc4a588454cdd83711151fb9459c0','0828d25b5b3c4e5a87d80b44a6dc8eaf','3db00e028b4f47fea4be23fe9f0b9c85',53,4,'Thank you for sharing 53 servings with our community.','Hillcrest Cafe','Sunrise NGO','2026-10-28 14:58:36.802555',NULL);
INSERT INTO "donation_recognitions" VALUES('a8c71e7f201c4b309132ae1fb9dce78e','2e0d2bad97d14223bfad11ee23a3abe4','a4146f8b68484ee8a23f2b0620e0a01a','235c5679a2ce40458ad9616f9ffa0116','4944ca67e25f4ed5baf893e237120ab8',89,4,'Thank you for sharing 89 servings with our community.','Silicon Square Kitchen','City Food Relief','2026-11-01 14:31:36.808936',NULL);
INSERT INTO "donation_recognitions" VALUES('5f70a78eed1f4f6483100165439151b8','6943a4b58ea2488cbf92e8be2541b84f','28635142d2844fedb3f47adfce28d119','d30a9ea1e0b64f278a9c787b6bae0846','69ebc5c43f89456d830c012ebdf5dbb3',59,4,'Thank you for sharing 59 servings with our community.','Banjara Table','Helping Hands','2026-11-05 14:19:36.817635',NULL);
INSERT INTO "donation_recognitions" VALUES('72b31443f91a497d81bcbe63661c61ff','cb912efcf76d428cb9cf5133502d32ee','08e1b365dfad466eb1144fa87d2e5f1d','54b7835b8f354ad49a61ac99b80d7b5f','9ce4ac93c25b479f89e1f70dce448869',51,4,'Thank you for sharing 51 servings with our community.','Botanical Kitchen','ShelterServe','2026-11-09 14:28:36.822200',NULL);
INSERT INTO "donation_recognitions" VALUES('f9fda71821914ecb979eb2f48788a154','14259bc927264ba7b76b4b84520f96a6','54c2130198874229a973ad62c6a35a1a','603977c2cf6d4190a7d1574cca1eac4e','fa9eea01876e4b70a32be653e7e81797',83,4,'Thank you for sharing 83 servings with our community.','Greenwood Banquets','Green Table Kitchen','2026-11-13 14:40:36.826871',NULL);
INSERT INTO "donation_recognitions" VALUES('4c86145bb3154b478f8829f99d4fee9f','ebc193ab8b9f4c7cac681989a8fd4475','82664df4c38a4992a43a3a3f2c2e1510','38236d5996f7445e9cfe99d65999c48a','c25100d2e97c46eba4cdc2cc86771f95',41,4,'Thank you for sharing 41 servings with our community.','Westline Bakers','Asha Kiran Shelter','2026-11-17 14:57:36.831905',NULL);
INSERT INTO "donation_recognitions" VALUES('9210277c70b649f1b6d74b6003d286da','1ff5a035f9844d2e8df0c42a0279732a','68d758aaea3c4df79b44c900ac9b9d8e','586621ca36d04e1583aa39309e1fdcd1','be726fa979fe4a3a918ad2cba82023ad',64,4,'Thank you for sharing 64 servings with our community.','Clocktower Kitchen','Roti Bank Hyderabad','2026-11-20 14:41:36.835650',NULL);
CREATE TABLE favorite_partners (
	user_id CHAR(32) NOT NULL, 
	organization_id CHAR(32) NOT NULL, 
	CONSTRAINT pk_favorite_partners PRIMARY KEY (user_id, organization_id), 
	CONSTRAINT fk_favorite_partners_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT fk_favorite_partners_organization_id_organizations FOREIGN KEY(organization_id) REFERENCES organizations (id) ON DELETE CASCADE
);
CREATE TABLE food_allocation_plans (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	receiver_organization_id CHAR(32) NOT NULL, 
	groups JSON NOT NULL, 
	revision INTEGER NOT NULL, 
	updated_at DATETIME NOT NULL, 
	CONSTRAINT pk_food_allocation_plans PRIMARY KEY (id), 
	CONSTRAINT uq_food_allocation_plans_rescue_id UNIQUE (rescue_id), 
	CONSTRAINT fk_food_allocation_plans_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id), 
	CONSTRAINT fk_food_allocation_plans_receiver_organization_id_organizations FOREIGN KEY(receiver_organization_id) REFERENCES organizations (id)
);
INSERT INTO "food_allocation_plans" VALUES('c5d7e860dd3c44c1be9d7a65c8f47385','d4d8ced75f3c43bf90478b349b3a646b','a4146f8b68484ee8a23f2b0620e0a01a','[{"name": "Community group A", "people": 20, "servings": 16, "dietary_notes": ""}, {"name": "Community group 2", "people": 10, "servings": 8, "dietary_notes": ""}]',1,'2026-11-22 05:47:45.199911');
INSERT INTO "food_allocation_plans" VALUES('1701f109b0f04e1e91fbfcd3c028140f','aafbb036e0214637b88d0a38f3dfd428','36fdcae7731549b0886f2c14ebb9a0c3','[{"name": "Community lunch", "people": 47, "servings": 47, "dietary_notes": ""}, {"name": "Evening service", "people": 48, "servings": 48, "dietary_notes": ""}]',1,'2026-10-25 12:21:49.469152');
INSERT INTO "food_allocation_plans" VALUES('94f5f6fbb1a74461a2175ec0e8f5727e','0a956c9afa1e4eca94660d9979dc7246','36fdcae7731549b0886f2c14ebb9a0c3','[{"name": "Community lunch", "people": 33, "servings": 33, "dietary_notes": ""}, {"name": "Evening service", "people": 33, "servings": 33, "dietary_notes": ""}]',1,'2026-11-01 12:47:49.509118');
INSERT INTO "food_allocation_plans" VALUES('91d6735758094396935617231c8c5ca2','5565127f2537483cb39250cd198c3f9e','36fdcae7731549b0886f2c14ebb9a0c3','[{"name": "Community lunch", "people": 61, "servings": 61, "dietary_notes": ""}, {"name": "Evening service", "people": 62, "servings": 62, "dietary_notes": ""}]',1,'2026-11-08 12:35:49.526917');
INSERT INTO "food_allocation_plans" VALUES('82b1a6f706ba403f95514e5f365bf4a6','7412580afaa94eecb1829e2b084c94d6','36fdcae7731549b0886f2c14ebb9a0c3','[{"name": "Community lunch", "people": 57, "servings": 57, "dietary_notes": ""}, {"name": "Evening service", "people": 57, "servings": 57, "dietary_notes": ""}]',1,'2026-11-17 12:32:49.553584');
INSERT INTO "food_allocation_plans" VALUES('3c13056bb9e34cd9a648c63a145b4f89','6b041b6fd63041359ae80d0bfa255cbf','36fdcae7731549b0886f2c14ebb9a0c3','[{"name": "Community lunch", "people": 34, "servings": 34, "dietary_notes": ""}, {"name": "Evening service", "people": 34, "servings": 34, "dietary_notes": ""}]',1,'2026-10-26 14:40:36.793862');
CREATE TABLE food_items (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	quantity_servings INTEGER NOT NULL, 
	dietary_type VARCHAR(32) NOT NULL, 
	food_category VARCHAR(32) NOT NULL, 
	allergens JSON NOT NULL, 
	allergen_info_unknown BOOLEAN NOT NULL, 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_food_items PRIMARY KEY (id), 
	CONSTRAINT ck_food_items_ck_food_items_quantity_positive CHECK (quantity_servings > 0), 
	CONSTRAINT ck_food_items_ck_food_items_dietary_type CHECK (dietary_type IN ('VEG', 'NON_VEG', 'VEGAN', 'JAIN', 'HALAL', 'GLUTEN_FREE', 'DIABETIC_FRIENDLY', 'RAW_VEGAN', 'OTHER', 'UNKNOWN')), 
	CONSTRAINT fk_food_items_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE
);
INSERT INTO "food_items" VALUES('d56f8cb0524341be9f42a703defb1a14','8210817870d64463b750dec5bd800613','Veg Biryani',100,'VEG','COOKED_MEAL','["dairy"]',0,'2026-11-21 19:39:19.449040');
INSERT INTO "food_items" VALUES('7d97ee50e34745bb80e7310abea60f19','8210817870d64463b750dec5bd800613','Dal',40,'VEG','COOKED_MEAL','[]',0,'2026-11-21 19:39:19.449040');
INSERT INTO "food_items" VALUES('e9529e12f2de4a8196beb4b21e681873','d4d8ced75f3c43bf90478b349b3a646b','Veg Biryani',25,'VEG','COOKED_MEAL','["dairy"]',0,'2026-11-21 20:18:51.316373');
INSERT INTO "food_items" VALUES('97d0b3e430714d0a9599a05cec63505e','80b1d375280c4eee9142635bc12a5e95','Chicken Biryani',50,'NON_VEG','COOKED_MEAL','[]',0,'2026-11-22 11:06:08.929470');
INSERT INTO "food_items" VALUES('3f311d162af447fbac88d62997f4f9c3','aafbb036e0214637b88d0a38f3dfd428','Veg Biryani',100,'VEG','COOKED_MEAL','["dairy"]',0,'2026-10-25 11:40:49.469152');
INSERT INTO "food_items" VALUES('d9b2429329354be0bd9fcec1dee7c8df','f063e8f9e0cc4dee9544d027d2d14e6c','Chicken Biryani',80,'NON_VEG','COOKED_MEAL','[]',0,'2026-10-26 11:40:49.481371');
INSERT INTO "food_items" VALUES('c9cfcca11b4a4277b2c27e8b5dee9e85','be7c42b400d444298de28feb16e6794a','Dal Tadka',60,'VEG','COOKED_MEAL','[]',0,'2026-10-27 11:40:49.493821');
INSERT INTO "food_items" VALUES('035a518b2e78436ba7d4a97aea6a7a74','2c3a19aa6c9c4c34bd5f44521e5f2b90','Paneer Butter Masala',120,'VEG','COOKED_MEAL','["dairy", "nuts"]',0,'2026-10-28 11:40:49.497336');
INSERT INTO "food_items" VALUES('04bdb249b28f4fb79a9829df674df534','71eac25bd95c4d38be8866954656f368','Chapati with Sabzi',90,'VEG','COOKED_MEAL','["gluten"]',0,'2026-10-29 11:40:49.499343');
INSERT INTO "food_items" VALUES('58f9ef5efc82492d8bb66112c8b4782a','104c163e2c3c4c769c1e99d948d4f04a','Plain Rice',50,'VEG','COOKED_MEAL','[]',0,'2026-10-30 11:40:49.503098');
INSERT INTO "food_items" VALUES('3a62005a475a4b269f3fbf865aef55a9','63764a16a2f94f5985b0f241c64e49a2','Mixed Veg Curry',150,'VEG','COOKED_MEAL','[]',0,'2026-10-31 11:40:49.505105');
INSERT INTO "food_items" VALUES('330ac6f0765840f2960c004e7c4e554b','0a956c9afa1e4eca94660d9979dc7246','Sambar',70,'VEG','COOKED_MEAL','[]',0,'2026-11-01 11:40:49.509118');
INSERT INTO "food_items" VALUES('827c50f194a44f5a88ac8b4483dce295','44b8637a86c342b1a128369bb30905ee','Haleem',40,'NON_VEG','COOKED_MEAL','["gluten"]',0,'2026-11-02 11:40:49.513130');
INSERT INTO "food_items" VALUES('4b375306a6f64582bd855d94dff9812b','2b05e25f288343f7bde09a8b72e1f726','Pulao',110,'VEG','COOKED_MEAL','[]',0,'2026-11-03 11:40:49.513130');
INSERT INTO "food_items" VALUES('52ef816e20344cc4a06aa7d29be7998d','88430e8bbb51485cbd71e367b36289b3','Chicken Curry',85,'NON_VEG','COOKED_MEAL','[]',0,'2026-11-04 11:40:49.516884');
INSERT INTO "food_items" VALUES('006cad396af94cd3892508f579686733','df2433d620b24fd88c0e4e500fda458f','Fried Rice',200,'VEG','COOKED_MEAL','["egg"]',0,'2026-11-05 11:40:49.520898');
INSERT INTO "food_items" VALUES('6f5d6361a8c14b3e8a8b19aa83e0e12f','5a8b164702a24f5e93fcc64ef4e93a24','Kesari / Halwa',55,'VEG','COOKED_MEAL','["dairy", "nuts"]',0,'2026-11-06 11:40:49.522904');
INSERT INTO "food_items" VALUES('72516f3d9e584710ab60a25d46dac2f4','1d5891c2c4654266beba13c7989e001e','Idli Sambar',95,'VEG','COOKED_MEAL','[]',0,'2026-11-07 11:40:49.524911');
INSERT INTO "food_items" VALUES('0a256ac8e6a14392b817c035a4f96a89','5565127f2537483cb39250cd198c3f9e','Poha',130,'VEG','COOKED_MEAL','[]',0,'2026-11-08 11:40:49.526917');
INSERT INTO "food_items" VALUES('4c9bdd8138e049cfb2e3b6a8380bf947','f12adf187e304159b93bbeea47bd61f1','Veg Biryani',100,'VEG','COOKED_MEAL','["dairy"]',0,'2026-11-09 11:40:49.528924');
INSERT INTO "food_items" VALUES('3152caa0342d45cebe3b43ebd9bad180','b32e178ab7ab4ab3ae9eaf66c3dd513c','Chicken Biryani',75,'NON_VEG','COOKED_MEAL','[]',0,'2026-11-10 11:40:49.534789');
INSERT INTO "food_items" VALUES('2b654c50f64a4176afabe06fb20e6ad5','6670de0672d94e6e82cd6771f40ce080','Dal Tadka',160,'VEG','COOKED_MEAL','[]',0,'2026-11-11 11:40:49.536794');
INSERT INTO "food_items" VALUES('fa52bf052e7649c08e679f1c905bef16','7205a4ca36624411aea13209c774cc61','Paneer Butter Masala',90,'VEG','COOKED_MEAL','["dairy", "nuts"]',0,'2026-11-12 11:40:49.540804');
INSERT INTO "food_items" VALUES('0e7af01508cb4ab480ddeb2a132436ce','e7121c3b44904ba59303f3e8dd767e4b','Chapati with Sabzi',110,'VEG','COOKED_MEAL','["gluten"]',0,'2026-11-13 11:40:49.544633');
INSERT INTO "food_items" VALUES('fd36155588d8466c9a86c1a5c2d66283','aa8fcc5446304a53b9a3f6ece0f96884','Plain Rice',45,'VEG','COOKED_MEAL','[]',0,'2026-11-14 11:40:49.548648');
INSERT INTO "food_items" VALUES('de30599795b44f4dbd55b1875259e16c','d11a83cbba4543a4810d8adf5d3980df','Mixed Veg Curry',180,'VEG','COOKED_MEAL','[]',0,'2026-11-15 11:40:49.548648');
INSERT INTO "food_items" VALUES('4187d686c751441ca6503d2b3e91006a','d98dd7a0d2394bd3bea09cf868f0a500','Sambar',95,'VEG','COOKED_MEAL','[]',0,'2026-11-16 11:40:49.553584');
INSERT INTO "food_items" VALUES('c40399128e4d4626ae995af7afb44436','7412580afaa94eecb1829e2b084c94d6','Haleem',120,'NON_VEG','COOKED_MEAL','["gluten"]',0,'2026-11-17 11:40:49.553584');
INSERT INTO "food_items" VALUES('72cc8db5a1474903977ac5c967a29669','b9bfa897a1a5432daa69cfa7d5e3fc77','Pulao',85,'VEG','COOKED_MEAL','[]',0,'2026-11-18 11:40:49.553584');
INSERT INTO "food_items" VALUES('2eef73f238eb464eb1bbd7feda492ed2','3db6520ac6924dfdb18880008afad9fc','Chicken Curry',60,'NON_VEG','COOKED_MEAL','[]',0,'2026-11-19 11:40:49.566136');
INSERT INTO "food_items" VALUES('597ca2d79560490e9a0fd020eca23055','fbd531e93ce143ea8c93014225d36840','Fried Rice',140,'VEG','COOKED_MEAL','["egg"]',0,'2026-11-20 11:40:49.568142');
INSERT INTO "food_items" VALUES('d39149d7de0241f98cc147c09c893e34','e2431930941047acabafa75d5916eb99','Kesari / Halwa',100,'VEG','COOKED_MEAL','["dairy", "nuts"]',0,'2026-11-20 23:40:49.570625');
INSERT INTO "food_items" VALUES('2b4bb261b1b6458a8bdf63e797153179','be65a257723947b586cd3fe47a0c08e1','Idli Sambar',75,'VEG','COOKED_MEAL','[]',0,'2026-11-21 11:40:49.573205');
INSERT INTO "food_items" VALUES('418c9c78e5714d06bf2a8ee4cec15104','20466b025596421289b38aab49db7e9f','Poha',90,'VEG','COOKED_MEAL','[]',0,'2026-11-21 23:40:49.573205');
INSERT INTO "food_items" VALUES('00aeb31000d54adfac851e0d5ba85c96','d4074ba1840641cd9eba63433361191d','Vegetable pulao',200,'VEG','COOKED_MEAL','[]',0,'2026-11-22 11:40:49.588018');
INSERT INTO "food_items" VALUES('3c2a0adaa4eb474c8351a3c74bbda633','a79b62eab9bb4df3b30f808a6b57069e','Wheat rolls',40,'VEG','BAKERY','["gluten"]',0,'2026-11-22 11:40:49.588018');
INSERT INTO "food_items" VALUES('90402ac4eee54595a6a8627b60f9793d','b0ca2b6f18b648c2bd4f9c422e5fcd17','Chilled fruit cups',35,'VEGAN','FRUIT_VEG','[]',0,'2026-11-22 11:40:49.588018');
INSERT INTO "food_items" VALUES('604e597c79b9416a950f7e29be03f350','acd9397963294c2d9932bc9fb15208ed','Dal and rice',45,'VEG','COOKED_MEAL','[]',0,'2026-11-22 11:40:49.588018');
INSERT INTO "food_items" VALUES('3e02799cd82344c8a22254f2df3ce72d','a0c004756f244f9a8a64332d51962f7b','Chapati with Curry',50,'VEG','COOKED_MEAL','[]',0,'2026-11-22 11:54:57.832566');
INSERT INTO "food_items" VALUES('21576e1e428149578f5463b6d17d75e9','6b041b6fd63041359ae80d0bfa255cbf','Veg Biryani',72,'VEG','COOKED_MEAL','["dairy"]',0,'2026-10-26 13:47:36.793862');
INSERT INTO "food_items" VALUES('4317f4195db74c9e8d90e5c6ee87c553','73492940f9f04e1b83969e60d0ed741f','Sambar',56,'VEG','COOKED_MEAL','[]',0,'2026-10-28 13:47:36.802555');
INSERT INTO "food_items" VALUES('1e0d4a14a77d4809a59f45697d62268c','2e0d2bad97d14223bfad11ee23a3abe4','Mixed Veg Curry',94,'VEG','COOKED_MEAL','[]',0,'2026-11-01 13:47:36.808936');
INSERT INTO "food_items" VALUES('8859a40b6d914668893467bc4419ddd6','6943a4b58ea2488cbf92e8be2541b84f','Pulao',63,'VEG','COOKED_MEAL','[]',0,'2026-11-05 13:47:36.817635');
INSERT INTO "food_items" VALUES('7a53a3e7ce14451eb2bac1fc15c7d081','cb912efcf76d428cb9cf5133502d32ee','Chapati with Sabzi',54,'VEG','COOKED_MEAL','["gluten"]',0,'2026-11-09 13:47:36.822200');
INSERT INTO "food_items" VALUES('9d5ff8511ef143bfa752b73e023fc05a','14259bc927264ba7b76b4b84520f96a6','Paneer Butter Masala',88,'VEG','COOKED_MEAL','["dairy", "nuts"]',0,'2026-11-13 13:47:36.826871');
INSERT INTO "food_items" VALUES('3315fadf6b4946f2897556d6cf77b9e6','ebc193ab8b9f4c7cac681989a8fd4475','Chicken Biryani',44,'NON_VEG','COOKED_MEAL','[]',0,'2026-11-17 13:47:36.831905');
INSERT INTO "food_items" VALUES('7ad3547aa4054f32b3340c8c6c46cfa4','1ff5a035f9844d2e8df0c42a0279732a','Kesari / Halwa',68,'VEG','COOKED_MEAL','["dairy", "nuts"]',0,'2026-11-20 13:47:36.835650');
INSERT INTO "food_items" VALUES('90ce38249f1a41d5a2207e10fadd6e0e','a55f092cb918462ba6461fea6102f7bb','Vegetable pulao',200,'VEG','COOKED_MEAL','[]',0,'2026-11-22 13:47:36.847668');
INSERT INTO "food_items" VALUES('14d3215d32f44d3893447c17e015d266','b050dcf687a04fd3af19603e6b67c623','Wheat rolls',40,'VEG','BAKERY','["gluten"]',0,'2026-11-22 13:47:36.847668');
INSERT INTO "food_items" VALUES('9255cf403d2546e49c8e8e18f54498d7','2cdc276eb9224dab9a741233374a59e2','Chilled fruit cups',35,'VEGAN','FRUIT_VEG','[]',0,'2026-11-22 13:47:36.847668');
INSERT INTO "food_items" VALUES('940eb5427ca44aeca45819783ea82d5d','f940f626151c4d1da3da3067ef32c324','Dal and rice',45,'VEG','COOKED_MEAL','[]',0,'2026-11-22 13:47:36.847668');
CREATE TABLE handoffs (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	pickup_code_hash VARCHAR(255), 
	pickup_code_display VARCHAR(255), 
	pickup_code_expires_at DATETIME, 
	pickup_code_attempts INTEGER NOT NULL, 
	collected_servings INTEGER, 
	delivered_servings INTEGER, 
	rejected_servings INTEGER, 
	collected_at DATETIME, 
	delivered_at DATETIME, 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_handoffs PRIMARY KEY (id), 
	CONSTRAINT ck_handoffs_ck_handoffs_pickup_code_attempts_nonnegative CHECK (pickup_code_attempts >= 0), 
	CONSTRAINT ck_handoffs_ck_handoffs_delivered_servings_nonnegative CHECK (delivered_servings IS NULL OR delivered_servings >= 0), 
	CONSTRAINT ck_handoffs_ck_handoffs_rejected_servings_nonnegative CHECK (rejected_servings IS NULL OR rejected_servings >= 0), 
	CONSTRAINT ck_handoffs_ck_handoffs_collected_gte_delivered CHECK (collected_servings IS NULL OR delivered_servings IS NULL OR collected_servings >= delivered_servings), 
	CONSTRAINT ck_handoffs_ck_handoffs_delivered_rejected_lte_collected CHECK (collected_servings IS NULL OR delivered_servings IS NULL OR rejected_servings IS NULL OR delivered_servings + rejected_servings <= collected_servings), 
	CONSTRAINT uq_handoffs_rescue_id UNIQUE (rescue_id), 
	CONSTRAINT fk_handoffs_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE
);
INSERT INTO "handoffs" VALUES('27893dadf6fd4441be601753b7086c63','d4d8ced75f3c43bf90478b349b3a646b','$2b$12$l7aXsPXXU6pvnm6DPK/dT.MEu70P9lcrFHnkdfFu0BfT0lPw4YCc.','gAAAAABrAfzpOWpG6ycX4mRXwucmu-sOGi0IyXs9GLgrMf594xO1-SgaQ5I-HC6FCFinqfrTeALORJB9WduWK1Ax4f1f9SBMUA==','2026-11-21 22:18:00.000000',0,25,24,1,'2026-11-21 20:28:53.693774','2026-11-21 20:29:10.321146','2026-11-21 20:19:53.015758');
INSERT INTO "handoffs" VALUES('429dde5ebf1b4790be5964c1b132ede6','aafbb036e0214637b88d0a38f3dfd428',NULL,NULL,NULL,0,100,95,5,'2026-10-25 12:07:49.469152','2026-10-25 12:21:49.469152','2026-10-25 11:45:49.469152');
INSERT INTO "handoffs" VALUES('d47854d49b074ea4acd79e30a88d187f','f063e8f9e0cc4dee9544d027d2d14e6c',NULL,NULL,NULL,0,80,76,4,'2026-10-26 12:18:49.481371','2026-10-26 12:41:49.481371','2026-10-26 11:45:49.481371');
INSERT INTO "handoffs" VALUES('ed15e34df9234dcea6df0c456cae8c12','2c3a19aa6c9c4c34bd5f44521e5f2b90',NULL,NULL,NULL,0,120,114,6,'2026-10-28 12:22:49.497336','2026-10-28 12:52:49.497336','2026-10-28 11:45:49.497336');
INSERT INTO "handoffs" VALUES('fd3f0079df11473c90ebc3d8b7e659f8','71eac25bd95c4d38be8866954656f368',NULL,NULL,NULL,0,90,85,5,'2026-10-29 12:18:49.499343','2026-10-29 12:36:49.499343','2026-10-29 11:45:49.499343');
INSERT INTO "handoffs" VALUES('4fc6e2cf7efd4e54ad43b321ad15c4ab','63764a16a2f94f5985b0f241c64e49a2',NULL,NULL,NULL,0,150,142,8,'2026-10-31 12:02:49.505105','2026-10-31 12:24:49.505105','2026-10-31 11:45:49.505105');
INSERT INTO "handoffs" VALUES('a10879e518294106b913a5d9a1354bd4','0a956c9afa1e4eca94660d9979dc7246',NULL,NULL,NULL,0,70,66,4,'2026-11-01 12:23:49.509118','2026-11-01 12:47:49.509118','2026-11-01 11:45:49.509118');
INSERT INTO "handoffs" VALUES('b3de894efd4f4f008c8c6508f25be702','2b05e25f288343f7bde09a8b72e1f726',NULL,NULL,NULL,0,110,104,6,'2026-11-03 12:22:49.513130','2026-11-03 12:34:49.513130','2026-11-03 11:45:49.513130');
INSERT INTO "handoffs" VALUES('65aa9ac1006c4af5b4a3092634514264','88430e8bbb51485cbd71e367b36289b3',NULL,NULL,NULL,0,85,80,5,'2026-11-04 12:07:49.516884','2026-11-04 12:20:49.516884','2026-11-04 11:45:49.516884');
INSERT INTO "handoffs" VALUES('206bfcb7000b46969c2774fd792ba40c','df2433d620b24fd88c0e4e500fda458f',NULL,NULL,NULL,0,200,190,10,'2026-11-05 12:11:49.520898','2026-11-05 12:32:49.520898','2026-11-05 11:45:49.520898');
INSERT INTO "handoffs" VALUES('dd9d43455ef64051bb4f352d87d75330','1d5891c2c4654266beba13c7989e001e',NULL,NULL,NULL,0,95,90,5,'2026-11-07 12:05:49.524911','2026-11-07 12:29:49.524911','2026-11-07 11:45:49.524911');
INSERT INTO "handoffs" VALUES('4613a55389884b5a8d5d50a48a27b2f2','5565127f2537483cb39250cd198c3f9e',NULL,NULL,NULL,0,130,123,7,'2026-11-08 12:24:49.526917','2026-11-08 12:35:49.526917','2026-11-08 11:45:49.526917');
INSERT INTO "handoffs" VALUES('06d6abcdd045429492f22e8a78c22cc5','f12adf187e304159b93bbeea47bd61f1',NULL,NULL,NULL,0,100,95,5,'2026-11-09 12:02:49.528924','2026-11-09 12:18:49.528924','2026-11-09 11:45:49.528924');
INSERT INTO "handoffs" VALUES('ab348a2776c84545bc2d2006fbf5207e','6670de0672d94e6e82cd6771f40ce080',NULL,NULL,NULL,0,160,152,8,'2026-11-11 12:04:49.536794','2026-11-11 12:22:49.536794','2026-11-11 11:45:49.536794');
INSERT INTO "handoffs" VALUES('540ff04b47be4b1aba1eb866d6503f0b','7205a4ca36624411aea13209c774cc61',NULL,NULL,NULL,0,90,85,5,'2026-11-12 12:23:49.540804','2026-11-12 12:51:49.540804','2026-11-12 11:45:49.540804');
INSERT INTO "handoffs" VALUES('48962e2a40c9483c85f901eb0902a0f6','e7121c3b44904ba59303f3e8dd767e4b',NULL,NULL,NULL,0,110,104,6,'2026-11-13 12:04:49.544633','2026-11-13 12:30:49.544633','2026-11-13 11:45:49.544633');
INSERT INTO "handoffs" VALUES('e68182809f9f48b38d1c61d66033f130','d11a83cbba4543a4810d8adf5d3980df',NULL,NULL,NULL,0,180,171,9,'2026-11-15 12:12:49.548648','2026-11-15 12:34:49.548648','2026-11-15 11:45:49.548648');
INSERT INTO "handoffs" VALUES('df6c3879b9984b97a782fb16850ca98a','d98dd7a0d2394bd3bea09cf868f0a500',NULL,NULL,NULL,0,95,90,5,'2026-11-16 12:21:49.553584','2026-11-16 12:34:49.553584','2026-11-16 11:45:49.553584');
INSERT INTO "handoffs" VALUES('a86c383e988c45e19836e4f70ce91e0f','7412580afaa94eecb1829e2b084c94d6',NULL,NULL,NULL,0,120,114,6,'2026-11-17 12:09:49.553584','2026-11-17 12:32:49.553584','2026-11-17 11:45:49.553584');
INSERT INTO "handoffs" VALUES('b7f8d544263c4496affb35b674197474','b9bfa897a1a5432daa69cfa7d5e3fc77',NULL,NULL,NULL,0,85,80,5,'2026-11-18 12:24:49.553584','2026-11-18 12:39:49.553584','2026-11-18 11:45:49.553584');
INSERT INTO "handoffs" VALUES('1f64f7cd08d645a49f39b134c625e3af','fbd531e93ce143ea8c93014225d36840',NULL,NULL,NULL,0,140,133,7,'2026-11-20 12:11:49.568142','2026-11-20 12:26:49.568142','2026-11-20 11:45:49.568142');
INSERT INTO "handoffs" VALUES('ac28d3d77aa14641be268e23bb44b512','e2431930941047acabafa75d5916eb99',NULL,NULL,NULL,0,100,95,5,'2026-11-21 00:00:49.570625','2026-11-21 00:13:49.570625','2026-11-20 23:45:49.570625');
INSERT INTO "handoffs" VALUES('369cc03de4954962aadaebded0bba2ba','be65a257723947b586cd3fe47a0c08e1',NULL,NULL,NULL,0,75,71,4,'2026-11-21 12:18:49.573205','2026-11-21 12:30:49.573205','2026-11-21 11:45:49.573205');
INSERT INTO "handoffs" VALUES('16bde15007c544df86d3e2ec8652c064','20466b025596421289b38aab49db7e9f',NULL,NULL,NULL,0,90,85,5,'2026-11-22 00:04:49.573205','2026-11-22 00:29:49.573205','2026-11-21 23:45:49.573205');
INSERT INTO "handoffs" VALUES('fc3c7111874a40ebb72a421214f18493','acd9397963294c2d9932bc9fb15208ed','$2b$12$wvWirvWW24BIs7yaNLvqHuePK3KUhj64YCD.b/Qtio/UE7cDNLphu','gAAAAABrAtTB5QVhc7oXrB1nR8dcSEh3fbb9Z-HKUdYFYDdbqrJ2ntUyyLNkLr3zcIOTg8ylqVSLkB766fQv-vVoYTtyAeqnjw==','2026-11-22 13:20:49.588018',0,NULL,NULL,NULL,NULL,NULL,'2026-11-22 11:40:49.827383');
INSERT INTO "handoffs" VALUES('f0780e7e28114103ae6694f41807fb73','6b041b6fd63041359ae80d0bfa255cbf',NULL,NULL,NULL,0,72,68,4,'2026-10-26 14:13:36.793862','2026-10-26 14:40:36.793862','2026-10-26 13:52:36.793862');
INSERT INTO "handoffs" VALUES('c385edef03824d9b8cf4b68cc35fafdc','73492940f9f04e1b83969e60d0ed741f',NULL,NULL,NULL,0,56,53,3,'2026-10-28 14:28:36.802555','2026-10-28 14:58:36.802555','2026-10-28 13:52:36.802555');
INSERT INTO "handoffs" VALUES('50069e8cf65e4f9fa7f9b029866e80c1','2e0d2bad97d14223bfad11ee23a3abe4',NULL,NULL,NULL,0,94,89,5,'2026-11-01 14:14:36.808936','2026-11-01 14:31:36.808936','2026-11-01 13:52:36.808936');
INSERT INTO "handoffs" VALUES('f06e8071d8cd4a46b2de9116c6178a9a','6943a4b58ea2488cbf92e8be2541b84f',NULL,NULL,NULL,0,63,59,4,'2026-11-05 14:07:36.817635','2026-11-05 14:19:36.817635','2026-11-05 13:52:36.817635');
INSERT INTO "handoffs" VALUES('7980850139d649118a550a03c49456e7','cb912efcf76d428cb9cf5133502d32ee',NULL,NULL,NULL,0,54,51,3,'2026-11-09 14:08:36.822200','2026-11-09 14:28:36.822200','2026-11-09 13:52:36.822200');
INSERT INTO "handoffs" VALUES('79b411533f3c458bbaa69114c684c29f','14259bc927264ba7b76b4b84520f96a6',NULL,NULL,NULL,0,88,83,5,'2026-11-13 14:13:36.826871','2026-11-13 14:40:36.826871','2026-11-13 13:52:36.826871');
INSERT INTO "handoffs" VALUES('3b3af24fd5454dde93e14c36c4caee96','ebc193ab8b9f4c7cac681989a8fd4475',NULL,NULL,NULL,0,44,41,3,'2026-11-17 14:32:36.831905','2026-11-17 14:57:36.831905','2026-11-17 13:52:36.831905');
INSERT INTO "handoffs" VALUES('fa4c8d5e7fe04aa8905d2a7bf7440366','1ff5a035f9844d2e8df0c42a0279732a',NULL,NULL,NULL,0,68,64,4,'2026-11-20 14:18:36.835650','2026-11-20 14:41:36.835650','2026-11-20 13:52:36.835650');
INSERT INTO "handoffs" VALUES('b70132c5da6d46b681d7d6b30685c9d1','f940f626151c4d1da3da3067ef32c324','$2b$12$M3DU4NQbScuW7OrbPtQeQ.q6qWq.VVrVruAudqlnLHHiNmj1juObe','gAAAAABrAvJ5sx3_bHzAojZu_lNmiR0SVyEfVhVef4Y2kqgA-1xRGjos_Xz73blBw5cBr3weaZ3wZx8bNLP1ZlX2HwPYcnWloQ==','2026-11-22 15:27:36.847668',0,NULL,NULL,NULL,NULL,NULL,'2026-11-22 13:47:37.094642');
CREATE TABLE impact_records (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	donor_organization_id CHAR(32) NOT NULL, 
	receiver_organization_id CHAR(32) NOT NULL, 
	delivered_servings INTEGER NOT NULL, 
	confirmed_kg FLOAT, 
	calculation_version VARCHAR(16) NOT NULL, 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_impact_records PRIMARY KEY (id), 
	CONSTRAINT ck_impact_records_ck_impact_records_delivered_servings_nonnegative CHECK (delivered_servings >= 0), 
	CONSTRAINT uq_impact_records_rescue_id UNIQUE (rescue_id), 
	CONSTRAINT fk_impact_records_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE, 
	CONSTRAINT fk_impact_records_donor_organization_id_organizations FOREIGN KEY(donor_organization_id) REFERENCES organizations (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_impact_records_receiver_organization_id_organizations FOREIGN KEY(receiver_organization_id) REFERENCES organizations (id) ON DELETE RESTRICT
);
INSERT INTO "impact_records" VALUES('4e4fc097ee114cf090625a0483fffc2d','d4d8ced75f3c43bf90478b349b3a646b','673c50c006ae477cbf99ec6ab6b6e181','a4146f8b68484ee8a23f2b0620e0a01a',24,NULL,'v1','2026-11-21 20:29:10.321146');
INSERT INTO "impact_records" VALUES('6db70fbee40848bd9ca51486c2f2c06a','aafbb036e0214637b88d0a38f3dfd428','673c50c006ae477cbf99ec6ab6b6e181','36fdcae7731549b0886f2c14ebb9a0c3',95,NULL,'v1','2026-10-25 12:21:49.469152');
INSERT INTO "impact_records" VALUES('964e1cd6a86e45589871a561a5e5e278','f063e8f9e0cc4dee9544d027d2d14e6c','3e7866beb6b6408296a7b8f3fd9cc991','08e1b365dfad466eb1144fa87d2e5f1d',76,NULL,'v1','2026-10-26 12:41:49.481371');
INSERT INTO "impact_records" VALUES('b8dc2716a48e4b88a4adbb69f91a4c3e','2c3a19aa6c9c4c34bd5f44521e5f2b90','e3b473430dc54f7dab07cafbf5d125a8','a4146f8b68484ee8a23f2b0620e0a01a',114,NULL,'v1','2026-10-28 12:52:49.497336');
INSERT INTO "impact_records" VALUES('5adec43d956148c39ecdee2db251909e','71eac25bd95c4d38be8866954656f368','673c50c006ae477cbf99ec6ab6b6e181','e4fbc4a588454cdd83711151fb9459c0',85,NULL,'v1','2026-10-29 12:36:49.499343');
INSERT INTO "impact_records" VALUES('91e5043c84e546d2af88ec46f3f99a79','63764a16a2f94f5985b0f241c64e49a2','3e7866beb6b6408296a7b8f3fd9cc991','28635142d2844fedb3f47adfce28d119',142,NULL,'v1','2026-10-31 12:24:49.505105');
INSERT INTO "impact_records" VALUES('029fae4f264f4cc9a22813e835816183','0a956c9afa1e4eca94660d9979dc7246','8acd0894fc764d96a50f112d1e5da6b0','36fdcae7731549b0886f2c14ebb9a0c3',66,NULL,'v1','2026-11-01 12:47:49.509118');
INSERT INTO "impact_records" VALUES('a5d034ce2ffb4d88840fcf981bfba835','2b05e25f288343f7bde09a8b72e1f726','e040e5f12c334135a8b08efa7f6280a9','54c2130198874229a973ad62c6a35a1a',104,NULL,'v1','2026-11-03 12:34:49.513130');
INSERT INTO "impact_records" VALUES('19607a72e90240708e32d5ee57c17a2c','88430e8bbb51485cbd71e367b36289b3','2e6ea167ff344239b7b5045919337543','08e1b365dfad466eb1144fa87d2e5f1d',80,NULL,'v1','2026-11-04 12:20:49.516884');
INSERT INTO "impact_records" VALUES('f31a9e4a5b104fcc90b7246d390d080c','df2433d620b24fd88c0e4e500fda458f','673c50c006ae477cbf99ec6ab6b6e181','82664df4c38a4992a43a3a3f2c2e1510',190,NULL,'v1','2026-11-05 12:32:49.520898');
INSERT INTO "impact_records" VALUES('02cb8ebb85b648e78ef0e57d30e628ae','1d5891c2c4654266beba13c7989e001e','3e7866beb6b6408296a7b8f3fd9cc991','68d758aaea3c4df79b44c900ac9b9d8e',90,NULL,'v1','2026-11-07 12:29:49.524911');
INSERT INTO "impact_records" VALUES('c66cd0a68bd7447db04272af905d2101','5565127f2537483cb39250cd198c3f9e','8acd0894fc764d96a50f112d1e5da6b0','36fdcae7731549b0886f2c14ebb9a0c3',123,NULL,'v1','2026-11-08 12:35:49.526917');
INSERT INTO "impact_records" VALUES('f067db03711e42a79160085b3f974167','f12adf187e304159b93bbeea47bd61f1','371484f32906439cb0277a8738663b60','a4146f8b68484ee8a23f2b0620e0a01a',95,NULL,'v1','2026-11-09 12:18:49.528924');
INSERT INTO "impact_records" VALUES('ba78c92afe184cc59912b057c3c900c9','6670de0672d94e6e82cd6771f40ce080','e040e5f12c334135a8b08efa7f6280a9','e4fbc4a588454cdd83711151fb9459c0',152,NULL,'v1','2026-11-11 12:22:49.536794');
INSERT INTO "impact_records" VALUES('caf4e97e61fc4a718d3365347d0a8ab1','7205a4ca36624411aea13209c774cc61','2e6ea167ff344239b7b5045919337543','28635142d2844fedb3f47adfce28d119',85,NULL,'v1','2026-11-12 12:51:49.540804');
INSERT INTO "impact_records" VALUES('75e5013c88ec4c7cb8c8ae5f97b87230','e7121c3b44904ba59303f3e8dd767e4b','673c50c006ae477cbf99ec6ab6b6e181','54c2130198874229a973ad62c6a35a1a',104,NULL,'v1','2026-11-13 12:30:49.544633');
INSERT INTO "impact_records" VALUES('d3e3dab3127d42bc8467bc8aa4db5935','d11a83cbba4543a4810d8adf5d3980df','8acd0894fc764d96a50f112d1e5da6b0','82664df4c38a4992a43a3a3f2c2e1510',171,NULL,'v1','2026-11-15 12:34:49.548648');
INSERT INTO "impact_records" VALUES('808b8980ef354663bb81220a67d0b84d','d98dd7a0d2394bd3bea09cf868f0a500','e3b473430dc54f7dab07cafbf5d125a8','68d758aaea3c4df79b44c900ac9b9d8e',90,NULL,'v1','2026-11-16 12:34:49.553584');
INSERT INTO "impact_records" VALUES('a6affd0ae26d4319acde90e2391340bb','7412580afaa94eecb1829e2b084c94d6','371484f32906439cb0277a8738663b60','36fdcae7731549b0886f2c14ebb9a0c3',114,NULL,'v1','2026-11-17 12:32:49.553584');
INSERT INTO "impact_records" VALUES('c257ead5e9ff4716bb4ca654f1807842','b9bfa897a1a5432daa69cfa7d5e3fc77','ba67eb6d9daa4a88aa0a1ef8f5a94145','08e1b365dfad466eb1144fa87d2e5f1d',80,NULL,'v1','2026-11-18 12:39:49.553584');
INSERT INTO "impact_records" VALUES('5f55865b4aea4f2b9d8b92901b78aef7','fbd531e93ce143ea8c93014225d36840','2e6ea167ff344239b7b5045919337543','a4146f8b68484ee8a23f2b0620e0a01a',133,NULL,'v1','2026-11-20 12:26:49.568142');
INSERT INTO "impact_records" VALUES('d030bda879704b25a9e92df8b13367b7','e2431930941047acabafa75d5916eb99','673c50c006ae477cbf99ec6ab6b6e181','e4fbc4a588454cdd83711151fb9459c0',95,NULL,'v1','2026-11-21 00:13:49.570625');
INSERT INTO "impact_records" VALUES('a37747b9ebd24a43b33ef340076ac1b8','be65a257723947b586cd3fe47a0c08e1','3e7866beb6b6408296a7b8f3fd9cc991','28635142d2844fedb3f47adfce28d119',71,NULL,'v1','2026-11-21 12:30:49.573205');
INSERT INTO "impact_records" VALUES('d6db642bf16c402ebfe12750b6e4dc5a','20466b025596421289b38aab49db7e9f','8acd0894fc764d96a50f112d1e5da6b0','54c2130198874229a973ad62c6a35a1a',85,NULL,'v1','2026-11-22 00:29:49.573205');
INSERT INTO "impact_records" VALUES('763e57eeca2a484eac783deefabd61fc','6b041b6fd63041359ae80d0bfa255cbf','7e3ef0d24d2a40b6801da28e9680f038','36fdcae7731549b0886f2c14ebb9a0c3',68,NULL,'v1','2026-10-26 14:40:36.793862');
INSERT INTO "impact_records" VALUES('b857d168b40f4e8b8aa09f0815c325d5','73492940f9f04e1b83969e60d0ed741f','69de81dbd0a6429295c00992fead6115','e4fbc4a588454cdd83711151fb9459c0',53,NULL,'v1','2026-10-28 14:58:36.802555');
INSERT INTO "impact_records" VALUES('718f6572e16b4c94804ecc07a6aa77e3','2e0d2bad97d14223bfad11ee23a3abe4','34345bc5b0014079bf001728535d8413','a4146f8b68484ee8a23f2b0620e0a01a',89,NULL,'v1','2026-11-01 14:31:36.808936');
INSERT INTO "impact_records" VALUES('d3c6765bd79849c38222cbefc49333f5','6943a4b58ea2488cbf92e8be2541b84f','2697f94f2776407f80d8b26cf15f01c0','28635142d2844fedb3f47adfce28d119',59,NULL,'v1','2026-11-05 14:19:36.817635');
INSERT INTO "impact_records" VALUES('fa7364298e674018ad6d9accd56da1e4','cb912efcf76d428cb9cf5133502d32ee','80a5f2a7a62d47e1a5d0986b919d9a74','08e1b365dfad466eb1144fa87d2e5f1d',51,NULL,'v1','2026-11-09 14:28:36.822200');
INSERT INTO "impact_records" VALUES('c83c1b41ffd04e3ea3f95c1bcaebf112','14259bc927264ba7b76b4b84520f96a6','029a552731374c26a03af0406bd1ef25','54c2130198874229a973ad62c6a35a1a',83,NULL,'v1','2026-11-13 14:40:36.826871');
INSERT INTO "impact_records" VALUES('e3fdf0ec310c4a8a90cbbe027e01f88f','ebc193ab8b9f4c7cac681989a8fd4475','015171d173674523bb1b94a100ff8ee6','82664df4c38a4992a43a3a3f2c2e1510',41,NULL,'v1','2026-11-17 14:57:36.831905');
INSERT INTO "impact_records" VALUES('31fc6fc5dff24e238f51f2496d1ac964','1ff5a035f9844d2e8df0c42a0279732a','b46e786dc3bd4b7aa3e93782b0ec895f','68d758aaea3c4df79b44c900ac9b9d8e',64,NULL,'v1','2026-11-20 14:41:36.835650');
CREATE TABLE logistics_providers (
	id CHAR(32) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	contact VARCHAR(160) NOT NULL, 
	resource VARCHAR(16) NOT NULL, 
	service_area VARCHAR(120) NOT NULL, 
	max_servings INTEGER NOT NULL, 
	refrigeration BOOLEAN NOT NULL, 
	available BOOLEAN NOT NULL, 
	CONSTRAINT pk_logistics_providers PRIMARY KEY (id)
);
INSERT INTO "logistics_providers" VALUES('01ecf044567c4c98b6e11617a5a31132','Hyderabad Container Bank','containers@rescuerelay.example','containers','Hyderabad',300,1,1);
INSERT INTO "logistics_providers" VALUES('33a5c95cda2f482d8c8cca86b3df273f','Hyderabad Community Courier','transport@rescuerelay.example','transport','Hyderabad',300,1,1);
CREATE TABLE match_offers (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	receiver_organization_id CHAR(32) NOT NULL, 
	rank INTEGER NOT NULL, 
	score FLOAT NOT NULL, 
	proximity_score FLOAT NOT NULL, 
	urgency_score FLOAT NOT NULL, 
	need_score FLOAT NOT NULL, 
	reliability_score FLOAT NOT NULL, 
	fairness_score FLOAT NOT NULL, 
	estimated_distance_km FLOAT NOT NULL, 
	estimated_travel_minutes FLOAT NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	offered_at DATETIME NOT NULL, 
	expires_at DATETIME NOT NULL, 
	claimed_at DATETIME, 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_match_offers PRIMARY KEY (id), 
	CONSTRAINT ck_match_offers_ck_match_offers_rank_positive CHECK (rank >= 1), 
	CONSTRAINT ck_match_offers_ck_match_offers_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'TIMED_OUT', 'CANCELLED')), 
	CONSTRAINT fk_match_offers_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE, 
	CONSTRAINT fk_match_offers_receiver_organization_id_organizations FOREIGN KEY(receiver_organization_id) REFERENCES organizations (id) ON DELETE CASCADE
);
INSERT INTO "match_offers" VALUES('b3ce95631e9843cfbafec2218238c22f','d4d8ced75f3c43bf90478b349b3a646b','36fdcae7731549b0886f2c14ebb9a0c3',1,0.789,0.935453057537434,3.85334289215426673e-01,1.0,0.96,1.0,9.68204136938489724e-01,2.904612410815468949e+00,'CANCELLED','2026-11-21 20:18:51.316373','2026-11-21 20:20:51.316373',NULL,'2026-11-21 20:18:51.316373');
INSERT INTO "match_offers" VALUES('1bc8e00406de4a47bfba6319a9c1e618','d4d8ced75f3c43bf90478b349b3a646b','a4146f8b68484ee8a23f2b0620e0a01a',1,0.6619,8.4991044299631624e-01,3.446871876513963318e-01,0.6,0.91,1.0,2.251343355055257068e+00,6.754030065165770757e+00,'ACCEPTED','2026-11-21 20:19:53.010445','2026-11-21 21:18:00.000000','2026-11-21 20:19:53.015758','2026-11-21 20:19:53.010445');
INSERT INTO "match_offers" VALUES('7b9c2552e09b4484b09d21f63c3f9aa8','80b1d375280c4eee9142635bc12a5e95','36fdcae7731549b0886f2c14ebb9a0c3',1,0.8633,0.935453057537434,6.328880257432043521e-01,1.0,0.96,1.0,9.68204136938489724e-01,2.904612410815468949e+00,'TIMED_OUT','2026-11-22 11:06:08.929470','2026-11-22 11:08:08.929470',NULL,'2026-11-22 11:06:08.929470');
INSERT INTO "match_offers" VALUES('31008a692d854534ab58570aff0a5013','80b1d375280c4eee9142635bc12a5e95','08e1b365dfad466eb1144fa87d2e5f1d',2,0.6383,6.249291854461909156e-01,2.387172488478771781e-01,1.0,0.98,1.0,5.626062218307136043e+00,1.687818665492140724e+01,'TIMED_OUT','2026-11-22 11:39:28.544609','2026-11-22 11:41:28.544609',NULL,'2026-11-22 11:39:28.544609');
INSERT INTO "match_offers" VALUES('8025bfe75a8b4ad7b82a2b75dbd0cfc2','aafbb036e0214637b88d0a38f3dfd428','36fdcae7731549b0886f2c14ebb9a0c3',1,0.85,0.9,0.8,0.8,0.96,0.7,3.0,15.0,'ACCEPTED','2026-10-25 11:44:49.469152','2026-10-25 12:07:49.469152','2026-10-25 11:45:49.469152','2026-10-25 11:44:49.469152');
INSERT INTO "match_offers" VALUES('4ea12b0d9d0140efab353c5e0987ff11','f063e8f9e0cc4dee9544d027d2d14e6c','08e1b365dfad466eb1144fa87d2e5f1d',1,0.85,0.9,0.8,0.8,0.98,0.7,3.0,15.0,'ACCEPTED','2026-10-26 11:44:49.481371','2026-10-26 12:18:49.481371','2026-10-26 11:45:49.481371','2026-10-26 11:44:49.481371');
INSERT INTO "match_offers" VALUES('5ce1e0d3350840b38dbf69ec27da2e09','2c3a19aa6c9c4c34bd5f44521e5f2b90','a4146f8b68484ee8a23f2b0620e0a01a',1,0.85,0.9,0.8,0.8,0.91,0.7,3.0,15.0,'ACCEPTED','2026-10-28 11:44:49.497336','2026-10-28 12:22:49.497336','2026-10-28 11:45:49.497336','2026-10-28 11:44:49.497336');
INSERT INTO "match_offers" VALUES('2f3da796b58b460ebdbb514dcab608a7','71eac25bd95c4d38be8866954656f368','e4fbc4a588454cdd83711151fb9459c0',1,0.85,0.9,0.8,0.8,0.89,0.7,3.0,15.0,'ACCEPTED','2026-10-29 11:44:49.499343','2026-10-29 12:18:49.499343','2026-10-29 11:45:49.499343','2026-10-29 11:44:49.499343');
INSERT INTO "match_offers" VALUES('fee4e45c32044bc7b1e4fdc9d3ac0391','63764a16a2f94f5985b0f241c64e49a2','28635142d2844fedb3f47adfce28d119',1,0.85,0.9,0.8,0.8,0.93,0.7,3.0,15.0,'ACCEPTED','2026-10-31 11:44:49.505105','2026-10-31 12:02:49.505105','2026-10-31 11:45:49.505105','2026-10-31 11:44:49.505105');
INSERT INTO "match_offers" VALUES('7a618d0dcc24476ab91eee781aba74bd','0a956c9afa1e4eca94660d9979dc7246','36fdcae7731549b0886f2c14ebb9a0c3',1,0.85,0.9,0.8,0.8,0.96,0.7,3.0,15.0,'ACCEPTED','2026-11-01 11:44:49.509118','2026-11-01 12:23:49.509118','2026-11-01 11:45:49.509118','2026-11-01 11:44:49.509118');
INSERT INTO "match_offers" VALUES('a259c1a13d4f473b867f45c6ae762b32','2b05e25f288343f7bde09a8b72e1f726','54c2130198874229a973ad62c6a35a1a',1,0.85,0.9,0.8,0.8,0.87,0.7,3.0,15.0,'ACCEPTED','2026-11-03 11:44:49.513130','2026-11-03 12:22:49.513130','2026-11-03 11:45:49.513130','2026-11-03 11:44:49.513130');
INSERT INTO "match_offers" VALUES('3eab333c487a472684734d7f74999230','88430e8bbb51485cbd71e367b36289b3','08e1b365dfad466eb1144fa87d2e5f1d',1,0.85,0.9,0.8,0.8,0.98,0.7,3.0,15.0,'ACCEPTED','2026-11-04 11:44:49.516884','2026-11-04 12:07:49.516884','2026-11-04 11:45:49.516884','2026-11-04 11:44:49.516884');
INSERT INTO "match_offers" VALUES('0dfec666056148d091f61378504e6f92','df2433d620b24fd88c0e4e500fda458f','82664df4c38a4992a43a3a3f2c2e1510',1,0.85,0.9,0.8,0.8,0.94,0.7,3.0,15.0,'ACCEPTED','2026-11-05 11:44:49.520898','2026-11-05 12:11:49.520898','2026-11-05 11:45:49.520898','2026-11-05 11:44:49.520898');
INSERT INTO "match_offers" VALUES('5f0e721bbaed40ee8d38944df8f1ccde','1d5891c2c4654266beba13c7989e001e','68d758aaea3c4df79b44c900ac9b9d8e',1,0.85,0.9,0.8,0.8,0.9,0.7,3.0,15.0,'ACCEPTED','2026-11-07 11:44:49.524911','2026-11-07 12:05:49.524911','2026-11-07 11:45:49.524911','2026-11-07 11:44:49.524911');
INSERT INTO "match_offers" VALUES('7ad15ee504fb4a60a9796908aabf6bc3','5565127f2537483cb39250cd198c3f9e','36fdcae7731549b0886f2c14ebb9a0c3',1,0.85,0.9,0.8,0.8,0.96,0.7,3.0,15.0,'ACCEPTED','2026-11-08 11:44:49.526917','2026-11-08 12:24:49.526917','2026-11-08 11:45:49.526917','2026-11-08 11:44:49.526917');
INSERT INTO "match_offers" VALUES('3590f61cf2be440a8e770039973e2aa6','f12adf187e304159b93bbeea47bd61f1','a4146f8b68484ee8a23f2b0620e0a01a',1,0.85,0.9,0.8,0.8,0.91,0.7,3.0,15.0,'ACCEPTED','2026-11-09 11:44:49.528924','2026-11-09 12:02:49.528924','2026-11-09 11:45:49.528924','2026-11-09 11:44:49.528924');
INSERT INTO "match_offers" VALUES('46e9b03bf46d409099471237ddfdfb26','6670de0672d94e6e82cd6771f40ce080','e4fbc4a588454cdd83711151fb9459c0',1,0.85,0.9,0.8,0.8,0.89,0.7,3.0,15.0,'ACCEPTED','2026-11-11 11:44:49.536794','2026-11-11 12:04:49.536794','2026-11-11 11:45:49.536794','2026-11-11 11:44:49.536794');
INSERT INTO "match_offers" VALUES('d7efba44b94747af8771be0ff8b8c5ac','7205a4ca36624411aea13209c774cc61','28635142d2844fedb3f47adfce28d119',1,0.85,0.9,0.8,0.8,0.93,0.7,3.0,15.0,'ACCEPTED','2026-11-12 11:44:49.540804','2026-11-12 12:23:49.540804','2026-11-12 11:45:49.540804','2026-11-12 11:44:49.540804');
INSERT INTO "match_offers" VALUES('be8ad9e1662c4091bbf55d691f554758','e7121c3b44904ba59303f3e8dd767e4b','54c2130198874229a973ad62c6a35a1a',1,0.85,0.9,0.8,0.8,0.87,0.7,3.0,15.0,'ACCEPTED','2026-11-13 11:44:49.544633','2026-11-13 12:04:49.544633','2026-11-13 11:45:49.544633','2026-11-13 11:44:49.544633');
INSERT INTO "match_offers" VALUES('439e46fda9474709ac6539131bcdb0ce','d11a83cbba4543a4810d8adf5d3980df','82664df4c38a4992a43a3a3f2c2e1510',1,0.85,0.9,0.8,0.8,0.94,0.7,3.0,15.0,'ACCEPTED','2026-11-15 11:44:49.548648','2026-11-15 12:12:49.548648','2026-11-15 11:45:49.548648','2026-11-15 11:44:49.548648');
INSERT INTO "match_offers" VALUES('ab02c0e6dbc34ce6bc0a65a867818560','d98dd7a0d2394bd3bea09cf868f0a500','68d758aaea3c4df79b44c900ac9b9d8e',1,0.85,0.9,0.8,0.8,0.9,0.7,3.0,15.0,'ACCEPTED','2026-11-16 11:44:49.553584','2026-11-16 12:21:49.553584','2026-11-16 11:45:49.553584','2026-11-16 11:44:49.553584');
INSERT INTO "match_offers" VALUES('d1fae17315e94570ba31b9dc757b7680','7412580afaa94eecb1829e2b084c94d6','36fdcae7731549b0886f2c14ebb9a0c3',1,0.85,0.9,0.8,0.8,0.96,0.7,3.0,15.0,'ACCEPTED','2026-11-17 11:44:49.553584','2026-11-17 12:09:49.553584','2026-11-17 11:45:49.553584','2026-11-17 11:44:49.553584');
INSERT INTO "match_offers" VALUES('20235c22155f4fa693a6193902031c7d','b9bfa897a1a5432daa69cfa7d5e3fc77','08e1b365dfad466eb1144fa87d2e5f1d',1,0.85,0.9,0.8,0.8,0.98,0.7,3.0,15.0,'ACCEPTED','2026-11-18 11:44:49.553584','2026-11-18 12:24:49.553584','2026-11-18 11:45:49.553584','2026-11-18 11:44:49.553584');
INSERT INTO "match_offers" VALUES('c4a32c7053954fa69b1240eb10f0cc38','fbd531e93ce143ea8c93014225d36840','a4146f8b68484ee8a23f2b0620e0a01a',1,0.85,0.9,0.8,0.8,0.91,0.7,3.0,15.0,'ACCEPTED','2026-11-20 11:44:49.568142','2026-11-20 12:11:49.568142','2026-11-20 11:45:49.568142','2026-11-20 11:44:49.568142');
INSERT INTO "match_offers" VALUES('3d9649ac2bc947df8f850a74c6ee9cd6','e2431930941047acabafa75d5916eb99','e4fbc4a588454cdd83711151fb9459c0',1,0.85,0.9,0.8,0.8,0.89,0.7,3.0,15.0,'ACCEPTED','2026-11-20 23:44:49.570625','2026-11-21 00:00:49.570625','2026-11-20 23:45:49.570625','2026-11-20 23:44:49.570625');
INSERT INTO "match_offers" VALUES('8c58225cc6d14037aab280ce0609ff9f','be65a257723947b586cd3fe47a0c08e1','28635142d2844fedb3f47adfce28d119',1,0.85,0.9,0.8,0.8,0.93,0.7,3.0,15.0,'ACCEPTED','2026-11-21 11:44:49.573205','2026-11-21 12:18:49.573205','2026-11-21 11:45:49.573205','2026-11-21 11:44:49.573205');
INSERT INTO "match_offers" VALUES('0823317ec8bb407f9365640da5ef390b','20466b025596421289b38aab49db7e9f','54c2130198874229a973ad62c6a35a1a',1,0.85,0.9,0.8,0.8,0.87,0.7,3.0,15.0,'ACCEPTED','2026-11-21 23:44:49.573205','2026-11-22 00:04:49.573205','2026-11-21 23:45:49.573205','2026-11-21 23:44:49.573205');
INSERT INTO "match_offers" VALUES('5fdbdd19fa8649f79f66d39563f81add','acd9397963294c2d9932bc9fb15208ed','82664df4c38a4992a43a3a3f2c2e1510',1,0.8,0.8,0.8,0.8,0.8,0.8,5.0,20.0,'ACCEPTED','2026-11-22 11:40:49.588018','2026-11-22 13:20:49.588018','2026-11-22 11:40:49.588018','2026-11-22 11:40:49.588018');
INSERT INTO "match_offers" VALUES('12205c59d1d44b489050a9edb4993f00','a79b62eab9bb4df3b30f808a6b57069e','e4fbc4a588454cdd83711151fb9459c0',1,0.9133,1.0,7.47517555833333347e-01,1.0,0.89,1.0,0.0,0.0,'TIMED_OUT','2026-11-22 11:41:07.461616','2026-11-22 11:43:07.461616',NULL,'2026-11-22 11:41:07.461616');
INSERT INTO "match_offers" VALUES('19aec342f5604fb1b6d42e76e4837ea6','d4074ba1840641cd9eba63433361191d','1639685cc1a24ba5ba1f1f74f1c28ab6',1,0.8208,9.75314539387679425e-01,7.382605081037131312e-01,0.6,0.88,1.0,3.702819091848087996e-01,1.110845727554426344e+00,'TIMED_OUT','2026-11-22 11:41:07.461616','2026-11-22 11:43:07.461616',NULL,'2026-11-22 11:41:07.461616');
INSERT INTO "match_offers" VALUES('685fd08b8f2c45f6b7852776153475bc','80b1d375280c4eee9142635bc12a5e95','6fb44f89d03745fd90bef9337565e700',2,0.7494,8.824917026532483888e-01,3.18510078356079196e-01,1.0,0.95,1.0,1.762624460201275057e+00,5.287873380603825168e+00,'TIMED_OUT','2026-11-22 11:41:29.455033','2026-11-22 11:43:29.455033',NULL,'2026-11-22 11:41:29.455033');
INSERT INTO "match_offers" VALUES('4275be21f80a43c7a8c9b73d7ef113c2','a79b62eab9bb4df3b30f808a6b57069e','36fdcae7731549b0886f2c14ebb9a0c3',2,0.7607,6.660428375948995727e-01,6.053376571536427386e-01,1.0,0.96,1.0,5.009357436076506077e+00,1.502807230822951823e+01,'TIMED_OUT','2026-11-22 11:43:09.472548','2026-11-22 11:45:09.472548',NULL,'2026-11-22 11:43:09.472548');
INSERT INTO "match_offers" VALUES('d74839dba45a4f97987691cd1fb6db6a','d4074ba1840641cd9eba63433361191d','a4146f8b68484ee8a23f2b0620e0a01a',2,0.7358,8.4991044299631624e-01,6.74288009179174086e-01,0.6,0.91,0.5,2.251343355055257068e+00,6.754030065165770757e+00,'TIMED_OUT','2026-11-22 11:43:09.472548','2026-11-22 11:45:09.472548',NULL,'2026-11-22 11:43:09.472548');
INSERT INTO "match_offers" VALUES('effbec84175140c2b5f83d5c418154f9','80b1d375280c4eee9142635bc12a5e95','1639685cc1a24ba5ba1f1f74f1c28ab6',3,0.6797,9.75314539387679425e-01,2.676440281037131274e-01,0.6,0.88,1.0,3.702819091848087996e-01,1.110845727554426344e+00,'TIMED_OUT','2026-11-22 11:51:46.312254','2026-11-22 11:53:46.312254',NULL,'2026-11-22 11:51:46.312254');
INSERT INTO "match_offers" VALUES('da8183d165f44243ae573ef8cfa37f19','a79b62eab9bb4df3b30f808a6b57069e','6fb44f89d03745fd90bef9337565e700',3,0.725,6.3761005485370581e-01,5.228920711256951349e-01,1.0,0.95,1.0,5.435849177194413073e+00,1.630754753158323922e+01,'TIMED_OUT','2026-11-22 11:51:46.312254','2026-11-22 11:53:46.312254',NULL,'2026-11-22 11:51:46.312254');
INSERT INTO "match_offers" VALUES('cd81a2018395496bbd067d668acdff1d','a0c004756f244f9a8a64332d51962f7b','36fdcae7731549b0886f2c14ebb9a0c3',1,0.8587,0.935453057537434,6.177625957432043568e-01,1.0,0.96,1.0,9.68204136938489724e-01,2.904612410815468949e+00,'TIMED_OUT','2026-11-22 11:54:57.832566','2026-11-22 11:56:57.832566',NULL,'2026-11-22 11:54:57.832566');
INSERT INTO "match_offers" VALUES('fd00b8120e3a4de4a9b473965d9c7708','80b1d375280c4eee9142635bc12a5e95','e4fbc4a588454cdd83711151fb9459c0',4,0.6209,6.903934878407653741e-01,1.341556697458425596e-01,1.0,0.89,1.0,4.64409768238852,1.393229304716556172e+01,'TIMED_OUT','2026-11-22 11:54:58.141595','2026-11-22 11:56:58.141595',NULL,'2026-11-22 11:54:58.141595');
INSERT INTO "match_offers" VALUES('6db92248d22b44269838af8e3a13b2e2','a79b62eab9bb4df3b30f808a6b57069e','28635142d2844fedb3f47adfce28d119',4,0.659,5.705845821185223655e-01,4.711145548222237523e-01,1.0,0.93,0.5,6.44123126822216463e+00,1.932369380466649388e+01,'TIMED_OUT','2026-11-22 11:54:58.141595','2026-11-22 11:56:58.141595',NULL,'2026-11-22 11:54:58.141595');
INSERT INTO "match_offers" VALUES('7be9e9c35cb044e380ee42a1e3382b80','80b1d375280c4eee9142635bc12a5e95','a4146f8b68484ee8a23f2b0620e0a01a',6,0.5866,8.4991044299631624e-01,1.771756369569519041e-01,0.6,0.91,0.5,2.251343355055257068e+00,6.754030065165770757e+00,'TIMED_OUT','2026-11-22 11:56:59.093610','2026-11-22 11:58:59.093610',NULL,'2026-11-22 11:56:59.093610');
INSERT INTO "match_offers" VALUES('151a909d1e7347ddb96df28719dfe1ff','a0c004756f244f9a8a64332d51962f7b','6fb44f89d03745fd90bef9337565e700',2,0.8282,8.824917026532483888e-01,5.810602759949681229e-01,1.0,0.95,1.0,1.762624460201275057e+00,5.287873380603825168e+00,'TIMED_OUT','2026-11-22 11:56:59.093610','2026-11-22 11:58:59.093610',NULL,'2026-11-22 11:56:59.093610');
INSERT INTO "match_offers" VALUES('311a8e8171a2497eb994825bf80cb208','a79b62eab9bb4df3b30f808a6b57069e','1639685cc1a24ba5ba1f1f74f1c28ab6',5,0.638,6.658076056176530643e-01,4.900242976621754786e-01,0.6,0.88,1.0,5.012885915735203923e+00,1.503865774720560999e+01,'TIMED_OUT','2026-11-22 11:56:59.093610','2026-11-22 11:58:59.093610',NULL,'2026-11-22 11:56:59.093610');
INSERT INTO "match_offers" VALUES('c24210f650904604a10b7b321a603098','a0c004756f244f9a8a64332d51962f7b','1639685cc1a24ba5ba1f1f74f1c28ab6',3,0.7715,9.75314539387679425e-01,5.737220404648243343e-01,0.6,0.88,1.0,3.702819091848087996e-01,1.110845727554426344e+00,'TIMED_OUT','2026-11-22 12:02:02.550565','2026-11-22 12:04:02.550565',NULL,'2026-11-22 12:02:02.550565');
INSERT INTO "match_offers" VALUES('9dfc54308c2c475986c76afd2bd56baa','a79b62eab9bb4df3b30f808a6b57069e','a4146f8b68484ee8a23f2b0620e0a01a',6,0.5861,6.283714804003162069e-01,4.338389514001185221e-01,0.6,0.91,0.5,5.574427793995258006e+00,1.672328338198577314e+01,'TIMED_OUT','2026-11-22 12:02:02.550565','2026-11-22 12:04:02.550565',NULL,'2026-11-22 12:02:02.550565');
INSERT INTO "match_offers" VALUES('c6af8a28bfc041f7981ce37dc7bc92d2','a0c004756f244f9a8a64332d51962f7b','e4fbc4a588454cdd83711151fb9459c0',4,0.7095,6.903934878407653741e-01,4.295929239125091947e-01,1.0,0.89,1.0,4.64409768238852,1.393229304716556172e+01,'TIMED_OUT','2026-11-22 12:06:30.993365','2026-11-22 12:08:30.993365',NULL,'2026-11-22 12:06:30.993365');
INSERT INTO "match_offers" VALUES('cf8d86b644904818a412e77298463312','a79b62eab9bb4df3b30f808a6b57069e','08e1b365dfad466eb1144fa87d2e5f1d',7,0.5577,3.489844540467272882e-01,2.917850942953004733e-01,1.0,0.98,1.0,9.76523318929909,2.929569956789727314e+01,'TIMED_OUT','2026-11-22 12:06:30.993365','2026-11-22 12:08:30.993365',NULL,'2026-11-22 12:06:30.993365');
INSERT INTO "match_offers" VALUES('e4c10ce6e5304037b484af5fe729340b','a0c004756f244f9a8a64332d51962f7b','08e1b365dfad466eb1144fa87d2e5f1d',5,0.6819,6.249291854461909156e-01,3.839713050978771914e-01,1.0,0.98,1.0,5.626062218307136043e+00,1.687818665492140724e+01,'TIMED_OUT','2026-11-22 12:09:02.715404','2026-11-22 12:11:02.715404',NULL,'2026-11-22 12:09:02.715404');
INSERT INTO "match_offers" VALUES('0b6159b366ef405885389d6da173892b','a79b62eab9bb4df3b30f808a6b57069e','5c34f178fcf941fab2b0ad6f69882abc',8,0.5403,5.260997047581622565e-01,3.371308078954218801e-01,0.6,0.85,1.0,7.108504428627566263e+00,21.3255132858827,'TIMED_OUT','2026-11-22 12:09:02.715404','2026-11-22 12:11:02.715404',NULL,'2026-11-22 12:09:02.715404');
INSERT INTO "match_offers" VALUES('4272280a062448469a6778095f1960bc','a0c004756f244f9a8a64332d51962f7b','a4146f8b68484ee8a23f2b0620e0a01a',6,0.6689,8.4991044299631624e-01,4.513118973736185979e-01,0.6,0.91,0.5,2.251343355055257068e+00,6.754030065165770757e+00,'TIMED_OUT','2026-11-22 12:11:05.312535','2026-11-22 12:13:05.312535',NULL,'2026-11-22 12:11:05.312535');
INSERT INTO "match_offers" VALUES('98e6b43f4d824524a88117e62e876ca2','a79b62eab9bb4df3b30f808a6b57069e','54c2130198874229a973ad62c6a35a1a',9,0.449,3.894456137224404645e-01,2.688581444514707707e-01,0.6,0.87,0.5,9.158315794163392808e+00,2.747494738249017843e+01,'TIMED_OUT','2026-11-22 12:11:05.312535','2026-11-22 12:13:05.312535',NULL,'2026-11-22 12:11:05.312535');
INSERT INTO "match_offers" VALUES('e5f5844d70b94b9c97a4b0ad010e7248','a0c004756f244f9a8a64332d51962f7b','5c34f178fcf941fab2b0ad6f69882abc',7,0.5921,6.538628137575210886e-01,3.609177211312927235e-01,0.6,0.85,1.0,5.192057793637182783e+00,1.557617338091154835e+01,'TIMED_OUT','2026-11-22 12:13:06.822005','2026-11-22 12:15:06.822005',NULL,'2026-11-22 12:13:06.822005');
INSERT INTO "match_offers" VALUES('65cc8b8cab064cab93e4f8ad946ef039','a79b62eab9bb4df3b30f808a6b57069e','68d758aaea3c4df79b44c900ac9b9d8e',10,0.403,6.759587661729815621e-02,1.31288177759264546e-01,1.0,0.9,1.0,1.398606185074052811e+01,4.195818555222158608e+01,'TIMED_OUT','2026-11-22 12:13:06.822005','2026-11-22 12:15:06.822005',NULL,'2026-11-22 12:13:06.822005');
INSERT INTO "match_offers" VALUES('357e1ae2d57045c8861105b55559c25d','a0c004756f244f9a8a64332d51962f7b','54c2130198874229a973ad62c6a35a1a',8,0.5245,5.695156759676285318e-01,3.104658329323052302e-01,0.6,0.87,0.5,6.457264860485572022e+00,1.937179458145671517e+01,'TIMED_OUT','2026-11-22 12:15:22.338328','2026-11-22 12:17:22.338328',NULL,'2026-11-22 12:15:22.338328');
INSERT INTO "match_offers" VALUES('bdaad7778d124c47b2a00fa28f9daf51','a79b62eab9bb4df3b30f808a6b57069e','aeec71cf311b4e8abb18963f517c6066',11,0.3692,2.173178396031127946e-02,9.5267431485116738e-02,1.0,0.83,1.0,1.467402324059533037e+01,4.402206972178598931e+01,'TIMED_OUT','2026-11-22 12:15:22.338328','2026-11-22 12:17:22.338328',NULL,'2026-11-22 12:15:22.338328');
INSERT INTO "match_offers" VALUES('70f5c9b18b934e1d9aee6654ad6c605b','6b041b6fd63041359ae80d0bfa255cbf','36fdcae7731549b0886f2c14ebb9a0c3',1,0.85,0.9,0.8,0.8,0.96,0.7,3.0,15.0,'ACCEPTED','2026-10-26 13:51:36.793862','2026-10-26 14:13:36.793862','2026-10-26 13:52:36.793862','2026-10-26 13:51:36.793862');
INSERT INTO "match_offers" VALUES('ee95368d7ab644d9a060cb3a8613d36d','73492940f9f04e1b83969e60d0ed741f','e4fbc4a588454cdd83711151fb9459c0',1,0.85,0.9,0.8,0.8,0.89,0.7,3.0,15.0,'ACCEPTED','2026-10-28 13:51:36.802555','2026-10-28 14:28:36.802555','2026-10-28 13:52:36.802555','2026-10-28 13:51:36.802555');
INSERT INTO "match_offers" VALUES('cfa8144fae1f4b56b890a451e2804d52','2e0d2bad97d14223bfad11ee23a3abe4','a4146f8b68484ee8a23f2b0620e0a01a',1,0.85,0.9,0.8,0.8,0.91,0.7,3.0,15.0,'ACCEPTED','2026-11-01 13:51:36.808936','2026-11-01 14:14:36.808936','2026-11-01 13:52:36.808936','2026-11-01 13:51:36.808936');
INSERT INTO "match_offers" VALUES('b891474bd89d4e84b313d693badf4454','6943a4b58ea2488cbf92e8be2541b84f','28635142d2844fedb3f47adfce28d119',1,0.85,0.9,0.8,0.8,0.93,0.7,3.0,15.0,'ACCEPTED','2026-11-05 13:51:36.817635','2026-11-05 14:07:36.817635','2026-11-05 13:52:36.817635','2026-11-05 13:51:36.817635');
INSERT INTO "match_offers" VALUES('91ab2fa2812e46fb9683948d06e016e2','cb912efcf76d428cb9cf5133502d32ee','08e1b365dfad466eb1144fa87d2e5f1d',1,0.85,0.9,0.8,0.8,0.98,0.7,3.0,15.0,'ACCEPTED','2026-11-09 13:51:36.822200','2026-11-09 14:08:36.822200','2026-11-09 13:52:36.822200','2026-11-09 13:51:36.822200');
INSERT INTO "match_offers" VALUES('466ea57e389e41ab867e091f34c4bc79','14259bc927264ba7b76b4b84520f96a6','54c2130198874229a973ad62c6a35a1a',1,0.85,0.9,0.8,0.8,0.87,0.7,3.0,15.0,'ACCEPTED','2026-11-13 13:51:36.826871','2026-11-13 14:13:36.826871','2026-11-13 13:52:36.826871','2026-11-13 13:51:36.826871');
INSERT INTO "match_offers" VALUES('f1d14efee5e64665a0acbb7665b158e6','ebc193ab8b9f4c7cac681989a8fd4475','82664df4c38a4992a43a3a3f2c2e1510',1,0.85,0.9,0.8,0.8,0.94,0.7,3.0,15.0,'ACCEPTED','2026-11-17 13:51:36.831905','2026-11-17 14:32:36.831905','2026-11-17 13:52:36.831905','2026-11-17 13:51:36.831905');
INSERT INTO "match_offers" VALUES('1cec1108ec684853ae4a5add451dae2c','1ff5a035f9844d2e8df0c42a0279732a','68d758aaea3c4df79b44c900ac9b9d8e',1,0.85,0.9,0.8,0.8,0.9,0.7,3.0,15.0,'ACCEPTED','2026-11-20 13:51:36.835650','2026-11-20 14:18:36.835650','2026-11-20 13:52:36.835650','2026-11-20 13:51:36.835650');
INSERT INTO "match_offers" VALUES('da7af40f7829454195397b01d7aa5198','f940f626151c4d1da3da3067ef32c324','82664df4c38a4992a43a3a3f2c2e1510',1,0.8,0.8,0.8,0.8,0.8,0.8,5.0,20.0,'ACCEPTED','2026-11-22 13:47:36.847668','2026-11-22 15:27:36.847668','2026-11-22 13:47:36.847668','2026-11-22 13:47:36.847668');
INSERT INTO "match_offers" VALUES('f62eb1b2cd384286987f20c68d9fbb43','a55f092cb918462ba6461fea6102f7bb','1639685cc1a24ba5ba1f1f74f1c28ab6',1,0.817,9.75314539387679425e-01,7.253272768537131209e-01,0.6,0.88,1.0,3.702819091848087996e-01,1.110845727554426344e+00,'TIMED_OUT','2026-11-22 13:49:27.840531','2026-11-22 13:51:27.840531',NULL,'2026-11-22 13:49:27.840531');
INSERT INTO "match_offers" VALUES('0260f7f1344f4206af8a525b5adcd936','b050dcf687a04fd3af19603e6b67c623','e4fbc4a588454cdd83711151fb9459c0',1,0.9094,1.0,7.345843245833332258e-01,1.0,0.89,1.0,0.0,0.0,'TIMED_OUT','2026-11-22 13:49:27.840531','2026-11-22 13:51:27.840531',NULL,'2026-11-22 13:49:27.840531');
INSERT INTO "match_offers" VALUES('e0066527e271496293028ae78c63364e','a55f092cb918462ba6461fea6102f7bb','a4146f8b68484ee8a23f2b0620e0a01a',2,0.7319,8.4991044299631624e-01,6.613169998736185828e-01,0.6,0.91,0.5,2.251343355055257068e+00,6.754030065165770757e+00,'PENDING','2026-11-22 13:51:30.123465','2026-11-22 13:53:30.123465',NULL,'2026-11-22 13:51:30.123465');
INSERT INTO "match_offers" VALUES('2ed54bebf061413c8416e633ac3e40d8','b050dcf687a04fd3af19603e6b67c623','36fdcae7731549b0886f2c14ebb9a0c3',2,0.7568,6.660428375948995727e-01,5.923666478480872355e-01,1.0,0.96,1.0,5.009357436076506077e+00,1.502807230822951823e+01,'PENDING','2026-11-22 13:51:30.123465','2026-11-22 13:53:30.123465',NULL,'2026-11-22 13:51:30.123465');
CREATE TABLE meal_feedback (
	rescue_id CHAR(32) NOT NULL, 
	answers JSON NOT NULL, 
	CONSTRAINT pk_meal_feedback PRIMARY KEY (rescue_id), 
	CONSTRAINT fk_meal_feedback_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE
);
INSERT INTO "meal_feedback" VALUES('aafbb036e0214637b88d0a38f3dfd428','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('f063e8f9e0cc4dee9544d027d2d14e6c','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('2c3a19aa6c9c4c34bd5f44521e5f2b90','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('71eac25bd95c4d38be8866954656f368','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('63764a16a2f94f5985b0f241c64e49a2','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('0a956c9afa1e4eca94660d9979dc7246','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('2b05e25f288343f7bde09a8b72e1f726','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('88430e8bbb51485cbd71e367b36289b3','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('df2433d620b24fd88c0e4e500fda458f','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('1d5891c2c4654266beba13c7989e001e','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('5565127f2537483cb39250cd198c3f9e','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('f12adf187e304159b93bbeea47bd61f1','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('6670de0672d94e6e82cd6771f40ce080','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('7205a4ca36624411aea13209c774cc61','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('e7121c3b44904ba59303f3e8dd767e4b','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('d11a83cbba4543a4810d8adf5d3980df','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('d98dd7a0d2394bd3bea09cf868f0a500','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('7412580afaa94eecb1829e2b084c94d6','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('b9bfa897a1a5432daa69cfa7d5e3fc77','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('fbd531e93ce143ea8c93014225d36840','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('e2431930941047acabafa75d5916eb99','{"taste": 5, "packaging": 4, "dietary_fit": 5, "staple_portion": "too_large", "vegetable_portion": "too_small"}');
INSERT INTO "meal_feedback" VALUES('be65a257723947b586cd3fe47a0c08e1','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('20466b025596421289b38aab49db7e9f','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('6b041b6fd63041359ae80d0bfa255cbf','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('73492940f9f04e1b83969e60d0ed741f','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('2e0d2bad97d14223bfad11ee23a3abe4','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('6943a4b58ea2488cbf92e8be2541b84f','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('cb912efcf76d428cb9cf5133502d32ee','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('14259bc927264ba7b76b4b84520f96a6','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('ebc193ab8b9f4c7cac681989a8fd4475','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
INSERT INTO "meal_feedback" VALUES('1ff5a035f9844d2e8df0c42a0279732a','{"taste": 4, "packaging": 4, "dietary_fit": 5, "staple_portion": "about_right", "vegetable_portion": "about_right"}');
CREATE TABLE organization_audits (
	id CHAR(32) NOT NULL, 
	organization_id CHAR(32) NOT NULL, 
	previous_status VARCHAR(32) NOT NULL, 
	new_status VARCHAR(32) NOT NULL, 
	reason VARCHAR(300) NOT NULL, 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_organization_audits PRIMARY KEY (id), 
	CONSTRAINT fk_organization_audits_organization_id_organizations FOREIGN KEY(organization_id) REFERENCES organizations (id)
);
CREATE TABLE organizations (
	id CHAR(32) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	organization_type VARCHAR(32) NOT NULL, 
	verification_status VARCHAR(32) NOT NULL, 
	locality VARCHAR(200) NOT NULL, 
	latitude FLOAT NOT NULL, 
	longitude FLOAT NOT NULL, 
	private_address VARCHAR(300), 
	private_phone VARCHAR(40), 
	reliability FLOAT NOT NULL, 
	trust_score FLOAT NOT NULL, 
	rank_badge VARCHAR(20), 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	CONSTRAINT pk_organizations PRIMARY KEY (id), 
	CONSTRAINT ck_organizations_organization_type_allowed CHECK (organization_type IN ('CATERER', 'NGO', 'COMMUNITY_KITCHEN', 'SHELTER', 'ADMIN')), 
	CONSTRAINT ck_organizations_verification_status_allowed CHECK (verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED')), 
	CONSTRAINT ck_organizations_reliability_range CHECK (reliability >= 0 AND reliability <= 1)
);
INSERT INTO "organizations" VALUES('673c50c006ae477cbf99ec6ab6b6e181','Madhapur Grand Events','CATERER','VERIFIED','Madhapur, Hyderabad',17.4483,78.3915,'12-3 Silicon Valley, Madhapur','+910000000000',0.95,0.801,'SILVER','2026-11-21 19:39:19.206105','2026-11-22 13:54:48.905393');
INSERT INTO "organizations" VALUES('36fdcae7731549b0886f2c14ebb9a0c3','Hope Community Kitchen','COMMUNITY_KITCHEN','VERIFIED','Madhapur, Hyderabad',17.4467,78.3852,NULL,NULL,0.96,0.952,'GOLD','2026-11-21 19:39:19.208105','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('08e1b365dfad466eb1144fa87d2e5f1d','ShelterServe','SHELTER','VERIFIED','Kondapur, Hyderabad',17.4619,78.3564,NULL,NULL,0.98,0.949,'GOLD','2026-11-21 19:39:19.209106','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('a4146f8b68484ee8a23f2b0620e0a01a','City Food Relief','NGO','VERIFIED','Hitech City, Hyderabad',17.4435,78.3772,NULL,NULL,0.91,0.961,'GOLD','2026-11-21 19:39:19.210105','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('0459660527b24d9aad08f7d7a3ab1edc','Food Rescue Relay Admin','ADMIN','VERIFIED','Hyderabad',17.385,78.4867,NULL,NULL,0.5,0.5,'NEW','2026-11-21 19:39:19.210105','2026-11-21 20:15:21.277559');
INSERT INTO "organizations" VALUES('3e7866beb6b6408296a7b8f3fd9cc991','Jubilee Hills Caterers','CATERER','VERIFIED','Jubilee Hills, Hyderabad',17.4229,78.4079,'Road No 36, Jubilee Hills','+919000000002',0.92,0.798,'SILVER','2026-11-22 11:40:49.451704','2026-11-22 13:54:48.905393');
INSERT INTO "organizations" VALUES('8acd0894fc764d96a50f112d1e5da6b0','Hitech Banquets & Events','CATERER','VERIFIED','Hitech City, Hyderabad',17.4442,78.3772,'CyberPearl, Hitech City','+919000000003',0.88,0.839,'SILVER','2026-11-22 11:40:49.451704','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('e3b473430dc54f7dab07cafbf5d125a8','Banjara Feasts','CATERER','VERIFIED','Banjara Hills, Hyderabad',17.4126,78.4499,'Road No 12, Banjara Hills','+919000000004',0.9,0.74,'SILVER','2026-11-22 11:40:49.453949','2026-11-22 13:54:48.905393');
INSERT INTO "organizations" VALUES('371484f32906439cb0277a8738663b60','Kondapur Catering Co.','CATERER','VERIFIED','Kondapur, Hyderabad',17.4619,78.3564,'Plot 7, Kondapur','+919000000005',0.85,0.755,'SILVER','2026-11-22 11:40:49.453949','2026-11-22 13:54:48.905393');
INSERT INTO "organizations" VALUES('ba67eb6d9daa4a88aa0a1ef8f5a94145','Gachibowli Events Hub','CATERER','VERIFIED','Gachibowli, Hyderabad',17.44,78.3489,'Financial District, Gachibowli','+919000000006',0.87,0.634,'BRONZE','2026-11-22 11:40:49.455956','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('e040e5f12c334135a8b08efa7f6280a9','Kukatpally Wedding Hall','CATERER','VERIFIED','Kukatpally, Hyderabad',17.4949,78.3996,'KPHB Phase 1, Kukatpally','+919000000007',0.82,0.783,'SILVER','2026-11-22 11:40:49.455956','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('2e6ea167ff344239b7b5045919337543','Secunderabad Palace Catr.','CATERER','VERIFIED','Secunderabad, Hyderabad',17.4474,78.4985,'MG Road, Secunderabad','+919000000008',0.91,0.933,'GOLD','2026-11-22 11:40:49.455956','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('e4fbc4a588454cdd83711151fb9459c0','Sunrise NGO','NGO','VERIFIED','Jubilee Hills, Hyderabad',17.4229,78.4079,NULL,NULL,0.89,0.937,'GOLD','2026-11-22 11:40:49.455956','2026-11-22 13:47:37.125463');
INSERT INTO "organizations" VALUES('28635142d2844fedb3f47adfce28d119','Helping Hands','NGO','VERIFIED','Banjara Hills, Hyderabad',17.4126,78.4499,NULL,NULL,0.93,0.919,'GOLD','2026-11-22 11:40:49.455956','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('54c2130198874229a973ad62c6a35a1a','Green Table Kitchen','COMMUNITY_KITCHEN','VERIFIED','Gachibowli, Hyderabad',17.44,78.3489,NULL,NULL,0.87,0.901,'GOLD','2026-11-22 11:40:49.461982','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('82664df4c38a4992a43a3a3f2c2e1510','Asha Kiran Shelter','SHELTER','VERIFIED','Kukatpally, Hyderabad',17.4949,78.3996,NULL,NULL,0.94,0.862,'GOLD','2026-11-22 11:40:49.461982','2026-11-22 13:54:48.905393');
INSERT INTO "organizations" VALUES('68d758aaea3c4df79b44c900ac9b9d8e','Roti Bank Hyderabad','NGO','VERIFIED','Secunderabad, Hyderabad',17.4474,78.4985,NULL,NULL,0.9,0.91,'GOLD','2026-11-22 11:40:49.464081','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('1639685cc1a24ba5ba1f1f74f1c28ab6','Annapurna Trust','NGO','VERIFIED','Madhapur, Hyderabad',17.4502,78.39,NULL,NULL,0.88,0.614,'NEW','2026-11-22 11:40:49.464081','2026-11-22 11:40:49.850513');
INSERT INTO "organizations" VALUES('6fb44f89d03745fd90bef9337565e700','Meals on Wheels HYD','COMMUNITY_KITCHEN','VERIFIED','Hitech City, Hyderabad',17.4455,78.38,NULL,NULL,0.95,0.635,'NEW','2026-11-22 11:40:49.464081','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('5c34f178fcf941fab2b0ad6f69882abc','Nanakram Nagar Kitchen','COMMUNITY_KITCHEN','VERIFIED','Nanakramguda, Hyderabad',17.432,78.361,NULL,NULL,0.85,0.605,'NEW','2026-11-22 11:40:49.464081','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('aeec71cf311b4e8abb18963f517c6066','Miyapur Food Bank','NGO','VERIFIED','Miyapur, Hyderabad',17.5003,78.3515,NULL,NULL,0.83,0.599,'NEW','2026-11-22 11:40:49.464081','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('b359caf8a1994912a65d0876c5e92019','Uppal Community Centre','COMMUNITY_KITCHEN','VERIFIED','Uppal, Hyderabad',17.4051,78.559,NULL,NULL,0.8,0.59,'NEW','2026-11-22 11:40:49.469152','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('a323789803c24caaab2ee469beb5a2e8','LB Nagar Shelter','SHELTER','VERIFIED','LB Nagar, Hyderabad',17.3523,78.5476,NULL,NULL,0.86,0.608,'NEW','2026-11-22 11:40:49.469152','2026-11-22 11:40:49.851588');
INSERT INTO "organizations" VALUES('21fa6b93b02049b4a8fe3b9063e5364e','Medchal Food Drive','NGO','VERIFIED','Medchal, Hyderabad',17.5929,78.5121,NULL,NULL,0.79,0.587,'NEW','2026-11-22 11:40:49.469152','2026-11-22 11:40:49.850513');
INSERT INTO "organizations" VALUES('7e3ef0d24d2a40b6801da28e9680f038','Lakeview Kitchen','CATERER','VERIFIED','Madhapur, Hyderabad',17.4502,78.389,NULL,NULL,0.88,0.904,'GOLD','2026-11-22 13:47:36.737457','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('69de81dbd0a6429295c00992fead6115','Hillcrest Cafe','CATERER','VERIFIED','Jubilee Hills, Hyderabad',17.4301,78.4102,NULL,NULL,0.87,0.901,'GOLD','2026-11-22 13:47:36.737457','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('34345bc5b0014079bf001728535d8413','Silicon Square Kitchen','CATERER','VERIFIED','Hitech City, Hyderabad',17.448,78.3774,NULL,NULL,0.9,0.91,'GOLD','2026-11-22 13:47:36.737457','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('2697f94f2776407f80d8b26cf15f01c0','Banjara Table','CATERER','VERIFIED','Banjara Hills, Hyderabad',17.4171,78.4387,NULL,NULL,0.91,0.913,'GOLD','2026-11-22 13:47:36.737457','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('80a5f2a7a62d47e1a5d0986b919d9a74','Botanical Kitchen','CATERER','VERIFIED','Kondapur, Hyderabad',17.467,78.3618,NULL,NULL,0.86,0.898,'GOLD','2026-11-22 13:47:36.742312','2026-11-22 13:47:37.124467');
INSERT INTO "organizations" VALUES('029a552731374c26a03af0406bd1ef25','Greenwood Banquets','CATERER','VERIFIED','Gachibowli, Hyderabad',17.4372,78.3559,NULL,NULL,0.87,0.901,'GOLD','2026-11-22 13:47:36.742312','2026-11-22 13:47:37.123450');
INSERT INTO "organizations" VALUES('015171d173674523bb1b94a100ff8ee6','Westline Bakers','CATERER','VERIFIED','Kukatpally, Hyderabad',17.5,78.4015,NULL,NULL,0.84,0.892,'GOLD','2026-11-22 13:47:36.742312','2026-11-22 13:47:37.123450');
INSERT INTO "organizations" VALUES('b46e786dc3bd4b7aa3e93782b0ec895f','Clocktower Kitchen','CATERER','VERIFIED','Secunderabad, Hyderabad',17.4438,78.4939,NULL,NULL,0.89,0.907,'GOLD','2026-11-22 13:47:36.742312','2026-11-22 13:47:37.125463');
CREATE TABLE partner_messages (
	id CHAR(32) NOT NULL, 
	sender_org_id CHAR(32) NOT NULL, 
	recipient_org_id CHAR(32) NOT NULL, 
	message VARCHAR(500) NOT NULL, 
	created_at DATETIME NOT NULL, 
	read_at DATETIME, 
	CONSTRAINT pk_partner_messages PRIMARY KEY (id), 
	CONSTRAINT fk_partner_messages_sender_org_id_organizations FOREIGN KEY(sender_org_id) REFERENCES organizations (id), 
	CONSTRAINT fk_partner_messages_recipient_org_id_organizations FOREIGN KEY(recipient_org_id) REFERENCES organizations (id)
);
INSERT INTO "partner_messages" VALUES('4e2233f631404daf8e46960d2e2b9ce6','a4146f8b68484ee8a23f2b0620e0a01a','673c50c006ae477cbf99ec6ab6b6e181','Please confirm packaging and pickup time.','2026-11-21 20:19:43.876538','2026-11-21 20:36:34.427699');
INSERT INTO "partner_messages" VALUES('f2932d55d1814a23b12cbaa6dfe1e2d7','673c50c006ae477cbf99ec6ab6b6e181','36fdcae7731549b0886f2c14ebb9a0c3','Split proposal for FRR-66140576 · 30 servings','2026-11-22 11:40:49.588018','2026-11-22 12:12:14.387293');
INSERT INTO "partner_messages" VALUES('2057c6ef1d434f7a8da0622be1e74ce0','673c50c006ae477cbf99ec6ab6b6e181','1639685cc1a24ba5ba1f1f74f1c28ab6','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('cb8770a489154a6ca637c838c29ffd3a','673c50c006ae477cbf99ec6ab6b6e181','36fdcae7731549b0886f2c14ebb9a0c3','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977','2026-11-22 12:12:14.387293');
INSERT INTO "partner_messages" VALUES('55b130ef97234348bf612df98353e18a','673c50c006ae477cbf99ec6ab6b6e181','6fb44f89d03745fd90bef9337565e700','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('0900efe3f7b741a09d4f8c7fff1c1d20','673c50c006ae477cbf99ec6ab6b6e181','a4146f8b68484ee8a23f2b0620e0a01a','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('190ce37f7893471f8b2f5bdf453c3b02','673c50c006ae477cbf99ec6ab6b6e181','e4fbc4a588454cdd83711151fb9459c0','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('0e004085707a40448315da44b01838c1','673c50c006ae477cbf99ec6ab6b6e181','5c34f178fcf941fab2b0ad6f69882abc','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('f7e8b3d987f943289864b6828969ca2e','673c50c006ae477cbf99ec6ab6b6e181','08e1b365dfad466eb1144fa87d2e5f1d','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977','2026-11-22 12:16:14.640257');
INSERT INTO "partner_messages" VALUES('73344faca5f44bdbaa56948235dc21e1','673c50c006ae477cbf99ec6ab6b6e181','54c2130198874229a973ad62c6a35a1a','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('30e4a4c7ae2b470ebf0a3a5787ced167','673c50c006ae477cbf99ec6ab6b6e181','82664df4c38a4992a43a3a3f2c2e1510','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('245109d5bc5747d8ac978223b708313a','673c50c006ae477cbf99ec6ab6b6e181','aeec71cf311b4e8abb18963f517c6066','Split proposal for FRR-95049805 · 5 servings','2026-11-22 11:57:23.387977',NULL);
INSERT INTO "partner_messages" VALUES('9bba470d342743609fd920d4ec1f4dcb','36fdcae7731549b0886f2c14ebb9a0c3','673c50c006ae477cbf99ec6ab6b6e181','Please confirm ingredients and allergens.','2026-11-22 12:12:46.075759',NULL);
INSERT INTO "partner_messages" VALUES('e5d1321ba2964c12b2b51d857d6a7114','673c50c006ae477cbf99ec6ab6b6e181','36fdcae7731549b0886f2c14ebb9a0c3','Split proposal for FRR-47356976 · 30 servings','2026-11-22 13:47:36.847668','2026-11-22 13:52:55.873567');
CREATE TABLE partner_ratings (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	author_org_id CHAR(32) NOT NULL, 
	target_org_id CHAR(32) NOT NULL, 
	stars INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_partner_ratings PRIMARY KEY (id), 
	CONSTRAINT uq_partner_ratings_rescue_id UNIQUE (rescue_id, author_org_id), 
	CONSTRAINT ck_partner_ratings_rating_stars_range CHECK (stars >= 1 AND stars <= 5), 
	CONSTRAINT fk_partner_ratings_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id), 
	CONSTRAINT fk_partner_ratings_author_org_id_organizations FOREIGN KEY(author_org_id) REFERENCES organizations (id), 
	CONSTRAINT fk_partner_ratings_target_org_id_organizations FOREIGN KEY(target_org_id) REFERENCES organizations (id)
);
INSERT INTO "partner_ratings" VALUES('b8f3377737dd49878de32cfb811eb16a','aafbb036e0214637b88d0a38f3dfd428','673c50c006ae477cbf99ec6ab6b6e181','36fdcae7731549b0886f2c14ebb9a0c3',5,'2026-10-25 12:21:49.469152');
INSERT INTO "partner_ratings" VALUES('1981ce5812974e8d9291359388ee2f79','aafbb036e0214637b88d0a38f3dfd428','36fdcae7731549b0886f2c14ebb9a0c3','673c50c006ae477cbf99ec6ab6b6e181',5,'2026-10-25 12:21:49.469152');
INSERT INTO "partner_ratings" VALUES('a470fd7dafff446dad32ec3ae0d65e5b','f063e8f9e0cc4dee9544d027d2d14e6c','3e7866beb6b6408296a7b8f3fd9cc991','08e1b365dfad466eb1144fa87d2e5f1d',5,'2026-10-26 12:41:49.481371');
INSERT INTO "partner_ratings" VALUES('ebc5c24eb7e0480cb6147fa8be43afb3','f063e8f9e0cc4dee9544d027d2d14e6c','08e1b365dfad466eb1144fa87d2e5f1d','3e7866beb6b6408296a7b8f3fd9cc991',5,'2026-10-26 12:41:49.481371');
INSERT INTO "partner_ratings" VALUES('3a8947ba50674bef889f09e6787ab909','2c3a19aa6c9c4c34bd5f44521e5f2b90','e3b473430dc54f7dab07cafbf5d125a8','a4146f8b68484ee8a23f2b0620e0a01a',5,'2026-10-28 12:52:49.497336');
INSERT INTO "partner_ratings" VALUES('4c1a5335e7764a94a64462f1988ebdd4','2c3a19aa6c9c4c34bd5f44521e5f2b90','a4146f8b68484ee8a23f2b0620e0a01a','e3b473430dc54f7dab07cafbf5d125a8',5,'2026-10-28 12:52:49.497336');
INSERT INTO "partner_ratings" VALUES('675f50677a004beba29a03ecb7c99abe','71eac25bd95c4d38be8866954656f368','673c50c006ae477cbf99ec6ab6b6e181','e4fbc4a588454cdd83711151fb9459c0',4,'2026-10-29 12:36:49.499343');
INSERT INTO "partner_ratings" VALUES('5b3ea5d461564cd9981f4169b4a570d7','71eac25bd95c4d38be8866954656f368','e4fbc4a588454cdd83711151fb9459c0','673c50c006ae477cbf99ec6ab6b6e181',4,'2026-10-29 12:36:49.499343');
INSERT INTO "partner_ratings" VALUES('e1b135914b00474aa9704c8109ef2a65','63764a16a2f94f5985b0f241c64e49a2','3e7866beb6b6408296a7b8f3fd9cc991','28635142d2844fedb3f47adfce28d119',4,'2026-10-31 12:24:49.505105');
INSERT INTO "partner_ratings" VALUES('fce8cb303f3e42d78b7f2a5585ad55c6','63764a16a2f94f5985b0f241c64e49a2','28635142d2844fedb3f47adfce28d119','3e7866beb6b6408296a7b8f3fd9cc991',4,'2026-10-31 12:24:49.505105');
INSERT INTO "partner_ratings" VALUES('8cfb050a51984acf8b04a3508062dcf0','0a956c9afa1e4eca94660d9979dc7246','8acd0894fc764d96a50f112d1e5da6b0','36fdcae7731549b0886f2c14ebb9a0c3',4,'2026-11-01 12:47:49.509118');
INSERT INTO "partner_ratings" VALUES('f10f541b00724fb192c971bf3fd06cb3','0a956c9afa1e4eca94660d9979dc7246','36fdcae7731549b0886f2c14ebb9a0c3','8acd0894fc764d96a50f112d1e5da6b0',4,'2026-11-01 12:47:49.509118');
INSERT INTO "partner_ratings" VALUES('63bb27f17eca4d6ab6f5688eb6927fe7','2b05e25f288343f7bde09a8b72e1f726','e040e5f12c334135a8b08efa7f6280a9','54c2130198874229a973ad62c6a35a1a',4,'2026-11-03 12:34:49.513130');
INSERT INTO "partner_ratings" VALUES('c9ff096139f24f1f9988ffa64c6b3aef','2b05e25f288343f7bde09a8b72e1f726','54c2130198874229a973ad62c6a35a1a','e040e5f12c334135a8b08efa7f6280a9',4,'2026-11-03 12:34:49.513130');
INSERT INTO "partner_ratings" VALUES('ced61b83257c4b32a2b4af13fd346670','88430e8bbb51485cbd71e367b36289b3','2e6ea167ff344239b7b5045919337543','08e1b365dfad466eb1144fa87d2e5f1d',4,'2026-11-04 12:20:49.516884');
INSERT INTO "partner_ratings" VALUES('f24bf3332a5f4b7d8b1b30f84d4b0a31','88430e8bbb51485cbd71e367b36289b3','08e1b365dfad466eb1144fa87d2e5f1d','2e6ea167ff344239b7b5045919337543',4,'2026-11-04 12:20:49.516884');
INSERT INTO "partner_ratings" VALUES('4e2d8830d03749c2a9e211608a03f755','df2433d620b24fd88c0e4e500fda458f','673c50c006ae477cbf99ec6ab6b6e181','82664df4c38a4992a43a3a3f2c2e1510',5,'2026-11-05 12:32:49.520898');
INSERT INTO "partner_ratings" VALUES('7a17908235bd48f798643eda9c136430','df2433d620b24fd88c0e4e500fda458f','82664df4c38a4992a43a3a3f2c2e1510','673c50c006ae477cbf99ec6ab6b6e181',5,'2026-11-05 12:32:49.520898');
INSERT INTO "partner_ratings" VALUES('2aecd64f2ac84a93ae9a74ae96ee772f','1d5891c2c4654266beba13c7989e001e','3e7866beb6b6408296a7b8f3fd9cc991','68d758aaea3c4df79b44c900ac9b9d8e',4,'2026-11-07 12:29:49.524911');
INSERT INTO "partner_ratings" VALUES('98aa1634cd5f419a878a86523cd41803','1d5891c2c4654266beba13c7989e001e','68d758aaea3c4df79b44c900ac9b9d8e','3e7866beb6b6408296a7b8f3fd9cc991',4,'2026-11-07 12:29:49.524911');
INSERT INTO "partner_ratings" VALUES('ed2bdc5ea52241db8c71aab8e3ae0631','5565127f2537483cb39250cd198c3f9e','8acd0894fc764d96a50f112d1e5da6b0','36fdcae7731549b0886f2c14ebb9a0c3',4,'2026-11-08 12:35:49.526917');
INSERT INTO "partner_ratings" VALUES('94ed4e62252c4039bea049b79908798a','5565127f2537483cb39250cd198c3f9e','36fdcae7731549b0886f2c14ebb9a0c3','8acd0894fc764d96a50f112d1e5da6b0',4,'2026-11-08 12:35:49.526917');
INSERT INTO "partner_ratings" VALUES('91c68d7a50d34f8b9e3a11afcf062a75','f12adf187e304159b93bbeea47bd61f1','371484f32906439cb0277a8738663b60','a4146f8b68484ee8a23f2b0620e0a01a',5,'2026-11-09 12:18:49.528924');
INSERT INTO "partner_ratings" VALUES('ee87f06d94514274a96e0405348ab7fc','f12adf187e304159b93bbeea47bd61f1','a4146f8b68484ee8a23f2b0620e0a01a','371484f32906439cb0277a8738663b60',5,'2026-11-09 12:18:49.528924');
INSERT INTO "partner_ratings" VALUES('2069bc5edb3e4cd295c515bda6870713','6670de0672d94e6e82cd6771f40ce080','e040e5f12c334135a8b08efa7f6280a9','e4fbc4a588454cdd83711151fb9459c0',5,'2026-11-11 12:22:49.536794');
INSERT INTO "partner_ratings" VALUES('f70915ecfb9b42d09feed0c61847f6af','6670de0672d94e6e82cd6771f40ce080','e4fbc4a588454cdd83711151fb9459c0','e040e5f12c334135a8b08efa7f6280a9',5,'2026-11-11 12:22:49.536794');
INSERT INTO "partner_ratings" VALUES('a6543130d1d9402eb7cb0d0c78d047b7','7205a4ca36624411aea13209c774cc61','2e6ea167ff344239b7b5045919337543','28635142d2844fedb3f47adfce28d119',4,'2026-11-12 12:51:49.540804');
INSERT INTO "partner_ratings" VALUES('68150a71ed2545f0b3b5b2c129b31c71','7205a4ca36624411aea13209c774cc61','28635142d2844fedb3f47adfce28d119','2e6ea167ff344239b7b5045919337543',4,'2026-11-12 12:51:49.540804');
INSERT INTO "partner_ratings" VALUES('81455d925b1b40c883ce01c4f9c94565','e7121c3b44904ba59303f3e8dd767e4b','673c50c006ae477cbf99ec6ab6b6e181','54c2130198874229a973ad62c6a35a1a',4,'2026-11-13 12:30:49.544633');
INSERT INTO "partner_ratings" VALUES('7cf556b30be540dcb6b36cb1d9e8650d','e7121c3b44904ba59303f3e8dd767e4b','54c2130198874229a973ad62c6a35a1a','673c50c006ae477cbf99ec6ab6b6e181',4,'2026-11-13 12:30:49.544633');
INSERT INTO "partner_ratings" VALUES('24952e76617a494ab4493165ab490977','d11a83cbba4543a4810d8adf5d3980df','8acd0894fc764d96a50f112d1e5da6b0','82664df4c38a4992a43a3a3f2c2e1510',5,'2026-11-15 12:34:49.548648');
INSERT INTO "partner_ratings" VALUES('9e1794831dcf41b4b14c239843025fb9','d11a83cbba4543a4810d8adf5d3980df','82664df4c38a4992a43a3a3f2c2e1510','8acd0894fc764d96a50f112d1e5da6b0',5,'2026-11-15 12:34:49.548648');
INSERT INTO "partner_ratings" VALUES('517212951c404a5ab8c3dcd2f4997d66','d98dd7a0d2394bd3bea09cf868f0a500','e3b473430dc54f7dab07cafbf5d125a8','68d758aaea3c4df79b44c900ac9b9d8e',4,'2026-11-16 12:34:49.553584');
INSERT INTO "partner_ratings" VALUES('c96469901f72433782c173894fc5b9cc','d98dd7a0d2394bd3bea09cf868f0a500','68d758aaea3c4df79b44c900ac9b9d8e','e3b473430dc54f7dab07cafbf5d125a8',4,'2026-11-16 12:34:49.553584');
INSERT INTO "partner_ratings" VALUES('d5695c5cbd6443b48233f74b28d2aef8','7412580afaa94eecb1829e2b084c94d6','371484f32906439cb0277a8738663b60','36fdcae7731549b0886f2c14ebb9a0c3',5,'2026-11-17 12:32:49.553584');
INSERT INTO "partner_ratings" VALUES('e752b8298bd3484aad66c31af3c89901','7412580afaa94eecb1829e2b084c94d6','36fdcae7731549b0886f2c14ebb9a0c3','371484f32906439cb0277a8738663b60',5,'2026-11-17 12:32:49.553584');
INSERT INTO "partner_ratings" VALUES('0ff9c9b402f54069994b5016ba74a1d2','b9bfa897a1a5432daa69cfa7d5e3fc77','ba67eb6d9daa4a88aa0a1ef8f5a94145','08e1b365dfad466eb1144fa87d2e5f1d',4,'2026-11-18 12:39:49.553584');
INSERT INTO "partner_ratings" VALUES('2c88d9c582b94045932fda6e39c1783f','b9bfa897a1a5432daa69cfa7d5e3fc77','08e1b365dfad466eb1144fa87d2e5f1d','ba67eb6d9daa4a88aa0a1ef8f5a94145',4,'2026-11-18 12:39:49.553584');
INSERT INTO "partner_ratings" VALUES('e54a84beec6145f7a0999c875beb6d57','fbd531e93ce143ea8c93014225d36840','2e6ea167ff344239b7b5045919337543','a4146f8b68484ee8a23f2b0620e0a01a',5,'2026-11-20 12:26:49.568142');
INSERT INTO "partner_ratings" VALUES('8de51098ce3940ddab5cb9617e0f81e5','fbd531e93ce143ea8c93014225d36840','a4146f8b68484ee8a23f2b0620e0a01a','2e6ea167ff344239b7b5045919337543',5,'2026-11-20 12:26:49.568142');
INSERT INTO "partner_ratings" VALUES('79f5ba09294f490a9b2ae5aa8d3aa82f','e2431930941047acabafa75d5916eb99','673c50c006ae477cbf99ec6ab6b6e181','e4fbc4a588454cdd83711151fb9459c0',5,'2026-11-21 00:13:49.570625');
INSERT INTO "partner_ratings" VALUES('07ed600e1aa147f6bdc525b235811687','e2431930941047acabafa75d5916eb99','e4fbc4a588454cdd83711151fb9459c0','673c50c006ae477cbf99ec6ab6b6e181',5,'2026-11-21 00:13:49.570625');
INSERT INTO "partner_ratings" VALUES('9e4e4336394745fb81f3e4d2cce6b2d8','be65a257723947b586cd3fe47a0c08e1','3e7866beb6b6408296a7b8f3fd9cc991','28635142d2844fedb3f47adfce28d119',4,'2026-11-21 12:30:49.573205');
INSERT INTO "partner_ratings" VALUES('1e50f7d571fa47bea77b7c8fd61d9ec8','be65a257723947b586cd3fe47a0c08e1','28635142d2844fedb3f47adfce28d119','3e7866beb6b6408296a7b8f3fd9cc991',4,'2026-11-21 12:30:49.573205');
INSERT INTO "partner_ratings" VALUES('b3f63876fefd40f8870d01a683b2875d','20466b025596421289b38aab49db7e9f','8acd0894fc764d96a50f112d1e5da6b0','54c2130198874229a973ad62c6a35a1a',4,'2026-11-22 00:29:49.573205');
INSERT INTO "partner_ratings" VALUES('bb31ed35705d48a39034848650c1a888','20466b025596421289b38aab49db7e9f','54c2130198874229a973ad62c6a35a1a','8acd0894fc764d96a50f112d1e5da6b0',4,'2026-11-22 00:29:49.573205');
INSERT INTO "partner_ratings" VALUES('612a24b420c546049200659f17a9619f','d4d8ced75f3c43bf90478b349b3a646b','673c50c006ae477cbf99ec6ab6b6e181','a4146f8b68484ee8a23f2b0620e0a01a',5,'2026-11-22 12:06:24.776025');
INSERT INTO "partner_ratings" VALUES('fd13c498c2cd4767af6ea1c71243a2bc','6b041b6fd63041359ae80d0bfa255cbf','7e3ef0d24d2a40b6801da28e9680f038','36fdcae7731549b0886f2c14ebb9a0c3',4,'2026-10-26 14:40:36.793862');
INSERT INTO "partner_ratings" VALUES('65e2874b0f914ba2b12d4541786401b0','6b041b6fd63041359ae80d0bfa255cbf','36fdcae7731549b0886f2c14ebb9a0c3','7e3ef0d24d2a40b6801da28e9680f038',4,'2026-10-26 14:40:36.793862');
INSERT INTO "partner_ratings" VALUES('8e0422a0ac9645a49164c5011f2d8dd1','73492940f9f04e1b83969e60d0ed741f','69de81dbd0a6429295c00992fead6115','e4fbc4a588454cdd83711151fb9459c0',4,'2026-10-28 14:58:36.802555');
INSERT INTO "partner_ratings" VALUES('a75fcd2c7f394b0eba5728d843ef3126','73492940f9f04e1b83969e60d0ed741f','e4fbc4a588454cdd83711151fb9459c0','69de81dbd0a6429295c00992fead6115',4,'2026-10-28 14:58:36.802555');
INSERT INTO "partner_ratings" VALUES('d5f0eda587734dc1915bd1c90d7a80d0','2e0d2bad97d14223bfad11ee23a3abe4','34345bc5b0014079bf001728535d8413','a4146f8b68484ee8a23f2b0620e0a01a',4,'2026-11-01 14:31:36.808936');
INSERT INTO "partner_ratings" VALUES('ba44b831e0454702839f07fd89e76bd1','2e0d2bad97d14223bfad11ee23a3abe4','a4146f8b68484ee8a23f2b0620e0a01a','34345bc5b0014079bf001728535d8413',4,'2026-11-01 14:31:36.808936');
INSERT INTO "partner_ratings" VALUES('96c4880896bb4ff99e3f098cc607096e','6943a4b58ea2488cbf92e8be2541b84f','2697f94f2776407f80d8b26cf15f01c0','28635142d2844fedb3f47adfce28d119',4,'2026-11-05 14:19:36.817635');
INSERT INTO "partner_ratings" VALUES('428e03e7c381419ba1e9e7eddebdd640','6943a4b58ea2488cbf92e8be2541b84f','28635142d2844fedb3f47adfce28d119','2697f94f2776407f80d8b26cf15f01c0',4,'2026-11-05 14:19:36.817635');
INSERT INTO "partner_ratings" VALUES('f62f779999ee470c95e18848823d9def','cb912efcf76d428cb9cf5133502d32ee','80a5f2a7a62d47e1a5d0986b919d9a74','08e1b365dfad466eb1144fa87d2e5f1d',4,'2026-11-09 14:28:36.822200');
INSERT INTO "partner_ratings" VALUES('179ca25b5cb24dbbad697845f1c51a5b','cb912efcf76d428cb9cf5133502d32ee','08e1b365dfad466eb1144fa87d2e5f1d','80a5f2a7a62d47e1a5d0986b919d9a74',4,'2026-11-09 14:28:36.822200');
INSERT INTO "partner_ratings" VALUES('b7d165dd7eb04a75b1fbaacd38df43b0','14259bc927264ba7b76b4b84520f96a6','029a552731374c26a03af0406bd1ef25','54c2130198874229a973ad62c6a35a1a',4,'2026-11-13 14:40:36.826871');
INSERT INTO "partner_ratings" VALUES('1934a13be28a4653a8e33f09d4e6b87c','14259bc927264ba7b76b4b84520f96a6','54c2130198874229a973ad62c6a35a1a','029a552731374c26a03af0406bd1ef25',4,'2026-11-13 14:40:36.826871');
INSERT INTO "partner_ratings" VALUES('8a01b380377748a1b33130a5b6ec3495','ebc193ab8b9f4c7cac681989a8fd4475','015171d173674523bb1b94a100ff8ee6','82664df4c38a4992a43a3a3f2c2e1510',4,'2026-11-17 14:57:36.831905');
INSERT INTO "partner_ratings" VALUES('ce4aeff2c9c04123a21dc2edb73090e5','ebc193ab8b9f4c7cac681989a8fd4475','82664df4c38a4992a43a3a3f2c2e1510','015171d173674523bb1b94a100ff8ee6',4,'2026-11-17 14:57:36.831905');
INSERT INTO "partner_ratings" VALUES('9a867a3cd6944cbcb453f75a8347e9b9','1ff5a035f9844d2e8df0c42a0279732a','b46e786dc3bd4b7aa3e93782b0ec895f','68d758aaea3c4df79b44c900ac9b9d8e',4,'2026-11-20 14:41:36.835650');
INSERT INTO "partner_ratings" VALUES('176e5954b6424f0aba02371af1b6a275','1ff5a035f9844d2e8df0c42a0279732a','68d758aaea3c4df79b44c900ac9b9d8e','b46e786dc3bd4b7aa3e93782b0ec895f',4,'2026-11-20 14:41:36.835650');
CREATE TABLE pickup_logistics (
	offer_id CHAR(32) NOT NULL, 
	donor_containers BOOLEAN NOT NULL, 
	donor_transport BOOLEAN NOT NULL, 
	receiver_containers BOOLEAN NOT NULL, 
	receiver_transport BOOLEAN NOT NULL, 
	arrangements JSON NOT NULL, 
	CONSTRAINT pk_pickup_logistics PRIMARY KEY (offer_id), 
	CONSTRAINT fk_pickup_logistics_offer_id_match_offers FOREIGN KEY(offer_id) REFERENCES match_offers (id) ON DELETE CASCADE
);
INSERT INTO "pickup_logistics" VALUES('5fdbdd19fa8649f79f66d39563f81add',0,0,0,0,'{}');
INSERT INTO "pickup_logistics" VALUES('da7af40f7829454195397b01d7aa5198',0,0,0,0,'{}');
CREATE TABLE receiver_capacities (
	id CHAR(32) NOT NULL, 
	organization_id CHAR(32) NOT NULL, 
	available BOOLEAN NOT NULL, 
	max_servings INTEGER NOT NULL, 
	available_servings INTEGER NOT NULL, 
	accepts_veg BOOLEAN NOT NULL, 
	accepts_non_veg BOOLEAN NOT NULL, 
	transport_available BOOLEAN NOT NULL, 
	need_level VARCHAR(16) NOT NULL, 
	updated_at DATETIME NOT NULL, accepted_dietary_types JSON DEFAULT '[]' NOT NULL, accepted_food_categories JSON DEFAULT '[]' NOT NULL, excluded_allergens JSON DEFAULT '[]' NOT NULL, description VARCHAR(500) DEFAULT '' NOT NULL, containers_available BOOLEAN DEFAULT true NOT NULL, refrigeration_available BOOLEAN DEFAULT false NOT NULL, volunteer_servings INTEGER, 
	CONSTRAINT pk_receiver_capacities PRIMARY KEY (id), 
	CONSTRAINT ck_receiver_capacities_max_servings_non_negative CHECK (max_servings >= 0), 
	CONSTRAINT ck_receiver_capacities_available_servings_range CHECK (available_servings >= 0 AND available_servings <= max_servings), 
	CONSTRAINT ck_receiver_capacities_need_level_allowed CHECK (need_level IN ('LOW', 'MEDIUM', 'HIGH')), 
	CONSTRAINT uq_receiver_capacities_organization_id UNIQUE (organization_id), 
	CONSTRAINT fk_receiver_capacities_organization_id_organizations FOREIGN KEY(organization_id) REFERENCES organizations (id) ON DELETE CASCADE
);
INSERT INTO "receiver_capacities" VALUES('350623d5b3a2418596606482e49db990','36fdcae7731549b0886f2c14ebb9a0c3',1,180,180,1,1,1,'HIGH','2026-11-21 19:39:19.452558','[]','[]','[]','',1,0,NULL);
INSERT INTO "receiver_capacities" VALUES('1817412e05994a8186741b71d288c02c','08e1b365dfad466eb1144fa87d2e5f1d',1,80,80,1,1,1,'HIGH','2026-11-21 19:39:19.452558','[]','[]','[]','',1,0,NULL);
INSERT INTO "receiver_capacities" VALUES('f58ba54ae42f4899911c1068011838b8','a4146f8b68484ee8a23f2b0620e0a01a',1,250,250,1,1,1,'MEDIUM','2026-11-21 20:19:53.015758','[]','[]','[]','',1,0,NULL);
INSERT INTO "receiver_capacities" VALUES('05056b5988bf4692be380b12d9e08986','e4fbc4a588454cdd83711151fb9459c0',1,120,120,1,1,0,'HIGH','2026-11-22 11:40:49.455956','[]','[]','[]','',0,0,NULL);
INSERT INTO "receiver_capacities" VALUES('7fbda514fde9450e8bd648afd95ff0e6','28635142d2844fedb3f47adfce28d119',1,160,160,1,1,1,'HIGH','2026-11-22 11:40:49.461982','[]','["COOKED_MEAL", "BAKERY", "PACKAGED"]','[]','',1,1,NULL);
INSERT INTO "receiver_capacities" VALUES('35584eab99ff46b89c0c65770a180366','54c2130198874229a973ad62c6a35a1a',1,100,100,1,0,1,'MEDIUM','2026-11-22 11:40:49.461982','["VEG", "VEGAN", "JAIN", "RAW_VEGAN"]','[]','[]','',1,0,NULL);
INSERT INTO "receiver_capacities" VALUES('ea505e65129a49a0820273c063bd0eb0','82664df4c38a4992a43a3a3f2c2e1510',1,60,60,1,1,0,'HIGH','2026-11-22 11:40:49.464081','[]','[]','[]','',1,0,30);
INSERT INTO "receiver_capacities" VALUES('b7aa153a55914257b94eac59e5bfcb0d','68d758aaea3c4df79b44c900ac9b9d8e',1,300,300,1,1,1,'HIGH','2026-11-22 11:40:49.464081','[]','["COOKED_MEAL", "BAKERY", "PACKAGED"]','[]','',0,1,NULL);
INSERT INTO "receiver_capacities" VALUES('c0dd008d8df0410d8bade5de69ff1192','1639685cc1a24ba5ba1f1f74f1c28ab6',1,200,200,1,1,1,'MEDIUM','2026-11-22 11:40:49.464081','[]','[]','[]','',1,0,NULL);
INSERT INTO "receiver_capacities" VALUES('b8aa43201f9d410a95bd580b087ce348','6fb44f89d03745fd90bef9337565e700',1,150,150,1,1,1,'HIGH','2026-11-22 11:40:49.464081','[]','[]','[]','',1,0,NULL);
INSERT INTO "receiver_capacities" VALUES('2eef8e195b8841f1b23d5862dd615b76','5c34f178fcf941fab2b0ad6f69882abc',1,90,90,1,0,0,'MEDIUM','2026-11-22 11:40:49.464081','["VEG", "VEGAN", "JAIN", "RAW_VEGAN"]','["COOKED_MEAL", "BAKERY", "PACKAGED"]','[]','',1,1,45);
INSERT INTO "receiver_capacities" VALUES('a11172a84ef04026ad5f76b681600c22','aeec71cf311b4e8abb18963f517c6066',1,120,120,1,1,0,'HIGH','2026-11-22 11:40:49.469152','[]','[]','[]','',0,0,NULL);
INSERT INTO "receiver_capacities" VALUES('c60dadfb731d481284b2a0dbc0e25335','b359caf8a1994912a65d0876c5e92019',1,70,70,1,1,1,'MEDIUM','2026-11-22 11:40:49.469152','[]','[]','[]','',1,0,NULL);
INSERT INTO "receiver_capacities" VALUES('5070f65720c34d24b179036398e4665e','a323789803c24caaab2ee469beb5a2e8',1,50,50,1,1,0,'HIGH','2026-11-22 11:40:49.469152','[]','["COOKED_MEAL", "BAKERY", "PACKAGED"]','[]','',1,1,NULL);
INSERT INTO "receiver_capacities" VALUES('c02494a6b37a48d59701bf3c535bb8a4','21fa6b93b02049b4a8fe3b9063e5364e',1,110,110,1,1,1,'MEDIUM','2026-11-22 11:40:49.469152','[]','[]','[]','',1,0,55);
CREATE TABLE rescues (
	id CHAR(32) NOT NULL, 
	display_id VARCHAR(12) NOT NULL, 
	donor_organization_id CHAR(32) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	prepared_at DATETIME NOT NULL, 
	pickup_by DATETIME NOT NULL, 
	handling_type VARCHAR(24) NOT NULL, 
	handling_notes TEXT, 
	untouched_confirmed BOOLEAN NOT NULL, 
	packaging_available BOOLEAN NOT NULL, 
	safety_attestation BOOLEAN NOT NULL, 
	latitude FLOAT NOT NULL, 
	longitude FLOAT NOT NULL, 
	private_address VARCHAR(300) NOT NULL, 
	locality VARCHAR(200) NOT NULL, 
	total_servings INTEGER NOT NULL, 
	dietary_type VARCHAR(32) NOT NULL, 
	idempotency_key VARCHAR(64) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, donor_transport_available BOOLEAN DEFAULT false NOT NULL, 
	CONSTRAINT pk_rescues PRIMARY KEY (id), 
	CONSTRAINT uq_rescue_donor_idempotency UNIQUE (donor_organization_id, idempotency_key), 
	CONSTRAINT ck_rescues_ck_rescues_total_servings_positive CHECK (total_servings > 0), 
	CONSTRAINT ck_rescues_ck_rescues_pickup_after_created CHECK (pickup_by > created_at), 
	CONSTRAINT ck_rescues_ck_rescues_status CHECK (status IN ('POSTED', 'MATCHING', 'OFFERED', 'CLAIMED', 'COLLECTED', 'DELIVERED', 'EXPIRED', 'CANCELLED')), 
	CONSTRAINT ck_rescues_ck_rescues_handling_type CHECK (handling_type IN ('HOT_HELD', 'REFRIGERATED', 'ROOM_TEMPERATURE', 'OTHER', 'UNKNOWN')), 
	CONSTRAINT ck_rescues_ck_rescues_dietary_type CHECK (dietary_type IN ('VEG', 'NON_VEG', 'VEGAN', 'JAIN', 'HALAL', 'GLUTEN_FREE', 'DIABETIC_FRIENDLY', 'RAW_VEGAN', 'OTHER', 'UNKNOWN')), 
	CONSTRAINT fk_rescues_donor_organization_id_organizations FOREIGN KEY(donor_organization_id) REFERENCES organizations (id) ON DELETE RESTRICT
);
INSERT INTO "rescues" VALUES('8210817870d64463b750dec5bd800613','FRR-84126439','673c50c006ae477cbf99ec6ab6b6e181','EXPIRED','2026-11-21 19:09:19.449040','2026-11-21 20:29:19.449040','HOT_HELD',NULL,1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',140,'VEG','demo-seed-madhapur-v1','2026-11-21 19:39:19.449040','2026-11-22 13:47:36.498731',0);
INSERT INTO "rescues" VALUES('d4d8ced75f3c43bf90478b349b3a646b','FRR-63549512','673c50c006ae477cbf99ec6ab6b6e181','DELIVERED','2026-11-21 19:48:00.000000','2026-11-21 21:18:00.000000','HOT_HELD','Confirm ingredients and packaging before pickup.',1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',25,'VEG','a18d729c994f4f74bf7745adcc2ca133','2026-11-21 20:18:51.316373','2026-11-22 13:54:48.905393',0);
INSERT INTO "rescues" VALUES('80b1d375280c4eee9142635bc12a5e95','FRR-46120554','673c50c006ae477cbf99ec6ab6b6e181','EXPIRED','2026-11-22 10:35:00.000000','2026-11-22 12:35:00.000000','HOT_HELD',NULL,1,0,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',50,'NON_VEG','d20daa482f874432a7eeba89d178966f','2026-11-22 11:06:08.929470','2026-11-22 13:49:27.903524',0);
INSERT INTO "rescues" VALUES('aafbb036e0214637b88d0a38f3dfd428','FRR-13278','673c50c006ae477cbf99ec6ab6b6e181','DELIVERED','2026-10-25 11:10:49.469152','2026-10-25 12:40:49.469152','REFRIGERATED',NULL,1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',100,'VEG','demo-history-v1-FRR-13278','2026-10-25 11:40:49.469152','2026-10-25 12:21:49.469152',0);
INSERT INTO "rescues" VALUES('f063e8f9e0cc4dee9544d027d2d14e6c','FRR-98696','3e7866beb6b6408296a7b8f3fd9cc991','DELIVERED','2026-10-26 11:10:49.481371','2026-10-26 12:40:49.481371','REFRIGERATED',NULL,1,1,1,17.4229,78.4079,'Road No 36, Jubilee Hills','Jubilee Hills, Hyderabad',80,'NON_VEG','demo-history-v1-FRR-98696','2026-10-26 11:40:49.481371','2026-10-26 12:41:49.481371',0);
INSERT INTO "rescues" VALUES('be7c42b400d444298de28feb16e6794a','FRR-22280','8acd0894fc764d96a50f112d1e5da6b0','EXPIRED','2026-10-27 11:10:49.493821','2026-10-27 12:40:49.493821','HOT_HELD',NULL,1,1,1,17.4442,78.3772,'CyberPearl, Hitech City','Hitech City, Hyderabad',60,'VEG','demo-history-v1-FRR-22280','2026-10-27 11:40:49.493821','2026-10-27 12:41:49.493821',0);
INSERT INTO "rescues" VALUES('2c3a19aa6c9c4c34bd5f44521e5f2b90','FRR-76237','e3b473430dc54f7dab07cafbf5d125a8','DELIVERED','2026-10-28 11:10:49.497336','2026-10-28 12:40:49.497336','HOT_HELD',NULL,1,1,1,17.4126,78.4499,'Road No 12, Banjara Hills','Banjara Hills, Hyderabad',120,'VEG','demo-history-v1-FRR-76237','2026-10-28 11:40:49.497336','2026-10-28 12:52:49.497336',0);
INSERT INTO "rescues" VALUES('71eac25bd95c4d38be8866954656f368','FRR-64987','673c50c006ae477cbf99ec6ab6b6e181','DELIVERED','2026-10-29 11:10:49.499343','2026-10-29 14:40:49.499343','REFRIGERATED',NULL,1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',90,'VEG','demo-history-v1-FRR-64987','2026-10-29 11:40:49.499343','2026-10-29 12:36:49.499343',0);
INSERT INTO "rescues" VALUES('104c163e2c3c4c769c1e99d948d4f04a','FRR-65392','371484f32906439cb0277a8738663b60','CANCELLED','2026-10-30 11:10:49.503098','2026-10-30 12:40:49.503098','HOT_HELD',NULL,1,1,1,17.4619,78.3564,'Plot 7, Kondapur','Kondapur, Hyderabad',50,'VEG','demo-history-v1-FRR-65392','2026-10-30 11:40:49.503098','2026-10-30 11:52:49.503098',0);
INSERT INTO "rescues" VALUES('63764a16a2f94f5985b0f241c64e49a2','FRR-38221','3e7866beb6b6408296a7b8f3fd9cc991','DELIVERED','2026-10-31 11:10:49.505105','2026-10-31 12:40:49.505105','ROOM_TEMPERATURE',NULL,1,1,1,17.4229,78.4079,'Road No 36, Jubilee Hills','Jubilee Hills, Hyderabad',150,'VEG','demo-history-v1-FRR-38221','2026-10-31 11:40:49.505105','2026-10-31 12:24:49.505105',0);
INSERT INTO "rescues" VALUES('0a956c9afa1e4eca94660d9979dc7246','FRR-55082','8acd0894fc764d96a50f112d1e5da6b0','DELIVERED','2026-11-01 11:10:49.509118','2026-11-01 13:40:49.509118','HOT_HELD',NULL,1,1,1,17.4442,78.3772,'CyberPearl, Hitech City','Hitech City, Hyderabad',70,'VEG','demo-history-v1-FRR-55082','2026-11-01 11:40:49.509118','2026-11-01 12:47:49.509118',0);
INSERT INTO "rescues" VALUES('44b8637a86c342b1a128369bb30905ee','FRR-59615','ba67eb6d9daa4a88aa0a1ef8f5a94145','EXPIRED','2026-11-02 11:10:49.513130','2026-11-02 12:40:49.513130','REFRIGERATED',NULL,1,1,1,17.44,78.3489,'Financial District, Gachibowli','Gachibowli, Hyderabad',40,'NON_VEG','demo-history-v1-FRR-59615','2026-11-02 11:40:49.513130','2026-11-02 12:41:49.513130',0);
INSERT INTO "rescues" VALUES('2b05e25f288343f7bde09a8b72e1f726','FRR-48427','e040e5f12c334135a8b08efa7f6280a9','DELIVERED','2026-11-03 11:10:49.513130','2026-11-03 14:40:49.513130','HOT_HELD',NULL,1,1,1,17.4949,78.3996,'KPHB Phase 1, Kukatpally','Kukatpally, Hyderabad',110,'VEG','demo-history-v1-FRR-48427','2026-11-03 11:40:49.513130','2026-11-03 12:34:49.513130',0);
INSERT INTO "rescues" VALUES('88430e8bbb51485cbd71e367b36289b3','FRR-39871','2e6ea167ff344239b7b5045919337543','DELIVERED','2026-11-04 11:10:49.516884','2026-11-04 14:40:49.516884','HOT_HELD',NULL,1,1,1,17.4474,78.4985,'MG Road, Secunderabad','Secunderabad, Hyderabad',85,'NON_VEG','demo-history-v1-FRR-39871','2026-11-04 11:40:49.516884','2026-11-04 12:20:49.516884',0);
INSERT INTO "rescues" VALUES('df2433d620b24fd88c0e4e500fda458f','FRR-69429','673c50c006ae477cbf99ec6ab6b6e181','DELIVERED','2026-11-05 11:10:49.520898','2026-11-05 13:40:49.520898','ROOM_TEMPERATURE',NULL,1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',200,'VEG','demo-history-v1-FRR-69429','2026-11-05 11:40:49.520898','2026-11-05 12:32:49.520898',0);
INSERT INTO "rescues" VALUES('5a8b164702a24f5e93fcc64ef4e93a24','FRR-44993','e3b473430dc54f7dab07cafbf5d125a8','CANCELLED','2026-11-06 11:10:49.522904','2026-11-06 14:40:49.522904','HOT_HELD',NULL,1,1,1,17.4126,78.4499,'Road No 12, Banjara Hills','Banjara Hills, Hyderabad',55,'VEG','demo-history-v1-FRR-44993','2026-11-06 11:40:49.522904','2026-11-06 11:44:49.522904',0);
INSERT INTO "rescues" VALUES('1d5891c2c4654266beba13c7989e001e','FRR-32431','3e7866beb6b6408296a7b8f3fd9cc991','DELIVERED','2026-11-07 11:10:49.524911','2026-11-07 14:40:49.524911','REFRIGERATED',NULL,1,1,1,17.4229,78.4079,'Road No 36, Jubilee Hills','Jubilee Hills, Hyderabad',95,'VEG','demo-history-v1-FRR-32431','2026-11-07 11:40:49.524911','2026-11-07 12:29:49.524911',0);
INSERT INTO "rescues" VALUES('5565127f2537483cb39250cd198c3f9e','FRR-93886','8acd0894fc764d96a50f112d1e5da6b0','DELIVERED','2026-11-08 11:10:49.526917','2026-11-08 13:40:49.526917','ROOM_TEMPERATURE',NULL,1,1,1,17.4442,78.3772,'CyberPearl, Hitech City','Hitech City, Hyderabad',130,'VEG','demo-history-v1-FRR-93886','2026-11-08 11:40:49.526917','2026-11-08 12:35:49.526917',0);
INSERT INTO "rescues" VALUES('f12adf187e304159b93bbeea47bd61f1','FRR-51347','371484f32906439cb0277a8738663b60','DELIVERED','2026-11-09 11:10:49.528924','2026-11-09 12:40:49.528924','HOT_HELD',NULL,1,1,1,17.4619,78.3564,'Plot 7, Kondapur','Kondapur, Hyderabad',100,'VEG','demo-history-v1-FRR-51347','2026-11-09 11:40:49.528924','2026-11-09 12:18:49.528924',0);
INSERT INTO "rescues" VALUES('b32e178ab7ab4ab3ae9eaf66c3dd513c','FRR-51245','ba67eb6d9daa4a88aa0a1ef8f5a94145','EXPIRED','2026-11-10 11:10:49.534789','2026-11-10 14:40:49.534789','REFRIGERATED',NULL,1,1,1,17.44,78.3489,'Financial District, Gachibowli','Gachibowli, Hyderabad',75,'NON_VEG','demo-history-v1-FRR-51245','2026-11-10 11:40:49.534789','2026-11-10 14:41:49.534789',0);
INSERT INTO "rescues" VALUES('6670de0672d94e6e82cd6771f40ce080','FRR-75435','e040e5f12c334135a8b08efa7f6280a9','DELIVERED','2026-11-11 11:10:49.536794','2026-11-11 14:40:49.536794','HOT_HELD',NULL,1,1,1,17.4949,78.3996,'KPHB Phase 1, Kukatpally','Kukatpally, Hyderabad',160,'VEG','demo-history-v1-FRR-75435','2026-11-11 11:40:49.536794','2026-11-11 12:22:49.536794',0);
INSERT INTO "rescues" VALUES('7205a4ca36624411aea13209c774cc61','FRR-83579','2e6ea167ff344239b7b5045919337543','DELIVERED','2026-11-12 11:10:49.540804','2026-11-12 12:40:49.540804','HOT_HELD',NULL,1,1,1,17.4474,78.4985,'MG Road, Secunderabad','Secunderabad, Hyderabad',90,'VEG','demo-history-v1-FRR-83579','2026-11-12 11:40:49.540804','2026-11-12 12:51:49.540804',0);
INSERT INTO "rescues" VALUES('e7121c3b44904ba59303f3e8dd767e4b','FRR-62350','673c50c006ae477cbf99ec6ab6b6e181','DELIVERED','2026-11-13 11:10:49.544633','2026-11-13 14:40:49.544633','ROOM_TEMPERATURE',NULL,1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',110,'VEG','demo-history-v1-FRR-62350','2026-11-13 11:40:49.544633','2026-11-13 12:30:49.544633',0);
INSERT INTO "rescues" VALUES('aa8fcc5446304a53b9a3f6ece0f96884','FRR-16175','3e7866beb6b6408296a7b8f3fd9cc991','CANCELLED','2026-11-14 11:10:49.548648','2026-11-14 12:40:49.548648','ROOM_TEMPERATURE',NULL,1,1,1,17.4229,78.4079,'Road No 36, Jubilee Hills','Jubilee Hills, Hyderabad',45,'VEG','demo-history-v1-FRR-16175','2026-11-14 11:40:49.548648','2026-11-14 11:45:49.548648',0);
INSERT INTO "rescues" VALUES('d11a83cbba4543a4810d8adf5d3980df','FRR-30969','8acd0894fc764d96a50f112d1e5da6b0','DELIVERED','2026-11-15 11:10:49.548648','2026-11-15 14:40:49.548648','HOT_HELD',NULL,1,1,1,17.4442,78.3772,'CyberPearl, Hitech City','Hitech City, Hyderabad',180,'VEG','demo-history-v1-FRR-30969','2026-11-15 11:40:49.548648','2026-11-15 12:34:49.548648',0);
INSERT INTO "rescues" VALUES('d98dd7a0d2394bd3bea09cf868f0a500','FRR-79352','e3b473430dc54f7dab07cafbf5d125a8','DELIVERED','2026-11-16 11:10:49.553584','2026-11-16 13:40:49.553584','REFRIGERATED',NULL,1,1,1,17.4126,78.4499,'Road No 12, Banjara Hills','Banjara Hills, Hyderabad',95,'VEG','demo-history-v1-FRR-79352','2026-11-16 11:40:49.553584','2026-11-16 12:34:49.553584',0);
INSERT INTO "rescues" VALUES('7412580afaa94eecb1829e2b084c94d6','FRR-44973','371484f32906439cb0277a8738663b60','DELIVERED','2026-11-17 11:10:49.553584','2026-11-17 14:40:49.553584','REFRIGERATED',NULL,1,1,1,17.4619,78.3564,'Plot 7, Kondapur','Kondapur, Hyderabad',120,'NON_VEG','demo-history-v1-FRR-44973','2026-11-17 11:40:49.553584','2026-11-17 12:32:49.553584',0);
INSERT INTO "rescues" VALUES('b9bfa897a1a5432daa69cfa7d5e3fc77','FRR-10425','ba67eb6d9daa4a88aa0a1ef8f5a94145','DELIVERED','2026-11-18 11:10:49.553584','2026-11-18 13:40:49.553584','HOT_HELD',NULL,1,1,1,17.44,78.3489,'Financial District, Gachibowli','Gachibowli, Hyderabad',85,'VEG','demo-history-v1-FRR-10425','2026-11-18 11:40:49.553584','2026-11-18 12:39:49.553584',0);
INSERT INTO "rescues" VALUES('3db6520ac6924dfdb18880008afad9fc','FRR-91959','e040e5f12c334135a8b08efa7f6280a9','EXPIRED','2026-11-19 11:10:49.566136','2026-11-19 12:40:49.566136','REFRIGERATED',NULL,1,1,1,17.4949,78.3996,'KPHB Phase 1, Kukatpally','Kukatpally, Hyderabad',60,'NON_VEG','demo-history-v1-FRR-91959','2026-11-19 11:40:49.566136','2026-11-19 12:41:49.566136',0);
INSERT INTO "rescues" VALUES('fbd531e93ce143ea8c93014225d36840','FRR-76540','2e6ea167ff344239b7b5045919337543','DELIVERED','2026-11-20 11:10:49.568142','2026-11-20 14:40:49.568142','ROOM_TEMPERATURE',NULL,1,1,1,17.4474,78.4985,'MG Road, Secunderabad','Secunderabad, Hyderabad',140,'VEG','demo-history-v1-FRR-76540','2026-11-20 11:40:49.568142','2026-11-20 12:26:49.568142',0);
INSERT INTO "rescues" VALUES('e2431930941047acabafa75d5916eb99','FRR-10074','673c50c006ae477cbf99ec6ab6b6e181','DELIVERED','2026-11-20 23:10:49.570625','2026-11-21 02:40:49.570625','REFRIGERATED',NULL,1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',100,'VEG','demo-history-v1-FRR-10074','2026-11-20 23:40:49.570625','2026-11-21 00:13:49.570625',0);
INSERT INTO "rescues" VALUES('be65a257723947b586cd3fe47a0c08e1','FRR-41385','3e7866beb6b6408296a7b8f3fd9cc991','DELIVERED','2026-11-21 11:10:49.573205','2026-11-21 13:40:49.573205','ROOM_TEMPERATURE',NULL,1,1,1,17.4229,78.4079,'Road No 36, Jubilee Hills','Jubilee Hills, Hyderabad',75,'VEG','demo-history-v1-FRR-41385','2026-11-21 11:40:49.573205','2026-11-21 12:30:49.573205',0);
INSERT INTO "rescues" VALUES('20466b025596421289b38aab49db7e9f','FRR-73699','8acd0894fc764d96a50f112d1e5da6b0','DELIVERED','2026-11-21 23:10:49.573205','2026-11-22 02:40:49.573205','HOT_HELD',NULL,1,1,1,17.4442,78.3772,'CyberPearl, Hitech City','Hitech City, Hyderabad',90,'VEG','demo-history-v1-FRR-73699','2026-11-21 23:40:49.573205','2026-11-22 00:29:49.573205',0);
INSERT INTO "rescues" VALUES('d4074ba1840641cd9eba63433361191d','FRR-66140576','673c50c006ae477cbf99ec6ab6b6e181','EXPIRED','2026-11-22 11:20:49.588018','2026-11-22 13:20:49.588018','HOT_HELD',NULL,1,1,1,17.4483,78.3915,'Demo venue address (synthetic)','Madhapur, Hyderabad',200,'VEG','demo-scenario-split-202611221140','2026-11-22 11:40:49.588018','2026-11-22 13:49:27.957729',0);
INSERT INTO "rescues" VALUES('a79b62eab9bb4df3b30f808a6b57069e','FRR-30978006','3e7866beb6b6408296a7b8f3fd9cc991','EXPIRED','2026-11-22 11:20:49.588018','2026-11-22 13:20:49.588018','ROOM_TEMPERATURE',NULL,1,1,1,17.4229,78.4079,'Road No 36, Jubilee Hills','Jubilee Hills, Hyderabad',40,'VEG','demo-scenario-bakery-202611221140','2026-11-22 11:40:49.588018','2026-11-22 13:49:27.932921',0);
INSERT INTO "rescues" VALUES('b0ca2b6f18b648c2bd4f9c422e5fcd17','FRR-76764925','e3b473430dc54f7dab07cafbf5d125a8','EXPIRED','2026-11-22 11:20:49.588018','2026-11-22 13:20:49.588018','REFRIGERATED',NULL,1,1,1,17.4126,78.4499,'Road No 12, Banjara Hills','Banjara Hills, Hyderabad',35,'VEG','demo-scenario-cold-202611221140','2026-11-22 11:40:49.588018','2026-11-22 13:49:27.954299',0);
INSERT INTO "rescues" VALUES('acd9397963294c2d9932bc9fb15208ed','FRR-48153905','371484f32906439cb0277a8738663b60','EXPIRED','2026-11-22 11:20:49.588018','2026-11-22 13:20:49.588018','HOT_HELD',NULL,1,0,1,17.4619,78.3564,'Plot 7, Kondapur','Kondapur, Hyderabad',45,'VEG','demo-scenario-support-202611221140','2026-11-22 11:40:49.588018','2026-11-22 13:49:27.935535',0);
INSERT INTO "rescues" VALUES('a0c004756f244f9a8a64332d51962f7b','FRR-95049805','673c50c006ae477cbf99ec6ab6b6e181','EXPIRED','2026-11-22 11:22:00.000000','2026-11-22 13:22:00.000000','HOT_HELD',NULL,1,0,1,17.4483,78.3915,'Demo venue address (synthetic)','madhapur',50,'VEG','88358c619e8011cf48e2fb281a796b16','2026-11-22 11:54:57.832566','2026-11-22 13:49:27.908339',0);
INSERT INTO "rescues" VALUES('6b041b6fd63041359ae80d0bfa255cbf','FRR-44741','7e3ef0d24d2a40b6801da28e9680f038','DELIVERED','2026-10-26 13:17:36.793862','2026-10-26 14:47:36.793862','REFRIGERATED',NULL,1,1,1,17.4502,78.389,'','Madhapur, Hyderabad',72,'VEG','demo-history-v1-FRR-44741','2026-10-26 13:47:36.793862','2026-10-26 14:40:36.793862',0);
INSERT INTO "rescues" VALUES('73492940f9f04e1b83969e60d0ed741f','FRR-36365','69de81dbd0a6429295c00992fead6115','DELIVERED','2026-10-28 13:17:36.802555','2026-10-28 16:47:36.802555','REFRIGERATED',NULL,1,1,1,17.4301,78.4102,'','Jubilee Hills, Hyderabad',56,'VEG','demo-history-v1-FRR-36365','2026-10-28 13:47:36.802555','2026-10-28 14:58:36.802555',0);
INSERT INTO "rescues" VALUES('2e0d2bad97d14223bfad11ee23a3abe4','FRR-77839','34345bc5b0014079bf001728535d8413','DELIVERED','2026-11-01 13:17:36.808936','2026-11-01 15:47:36.808936','ROOM_TEMPERATURE',NULL,1,1,1,17.448,78.3774,'','Hitech City, Hyderabad',94,'VEG','demo-history-v1-FRR-77839','2026-11-01 13:47:36.808936','2026-11-01 14:31:36.808936',0);
INSERT INTO "rescues" VALUES('6943a4b58ea2488cbf92e8be2541b84f','FRR-12757','2697f94f2776407f80d8b26cf15f01c0','DELIVERED','2026-11-05 13:17:36.817635','2026-11-05 15:47:36.817635','HOT_HELD',NULL,1,1,1,17.4171,78.4387,'','Banjara Hills, Hyderabad',63,'VEG','demo-history-v1-FRR-12757','2026-11-05 13:47:36.817635','2026-11-05 14:19:36.817635',0);
INSERT INTO "rescues" VALUES('cb912efcf76d428cb9cf5133502d32ee','FRR-17716','80a5f2a7a62d47e1a5d0986b919d9a74','DELIVERED','2026-11-09 13:17:36.822200','2026-11-09 16:47:36.822200','REFRIGERATED',NULL,1,1,1,17.467,78.3618,'','Kondapur, Hyderabad',54,'VEG','demo-history-v1-FRR-17716','2026-11-09 13:47:36.822200','2026-11-09 14:28:36.822200',0);
INSERT INTO "rescues" VALUES('14259bc927264ba7b76b4b84520f96a6','FRR-41195','029a552731374c26a03af0406bd1ef25','DELIVERED','2026-11-13 13:17:36.826871','2026-11-13 16:47:36.826871','HOT_HELD',NULL,1,1,1,17.4372,78.3559,'','Gachibowli, Hyderabad',88,'VEG','demo-history-v1-FRR-41195','2026-11-13 13:47:36.826871','2026-11-13 14:40:36.826871',0);
INSERT INTO "rescues" VALUES('ebc193ab8b9f4c7cac681989a8fd4475','FRR-84847','015171d173674523bb1b94a100ff8ee6','DELIVERED','2026-11-17 13:17:36.831905','2026-11-17 16:47:36.831905','HOT_HELD',NULL,1,1,1,17.5,78.4015,'','Kukatpally, Hyderabad',44,'NON_VEG','demo-history-v1-FRR-84847','2026-11-17 13:47:36.831905','2026-11-17 14:57:36.831905',0);
INSERT INTO "rescues" VALUES('1ff5a035f9844d2e8df0c42a0279732a','FRR-22363','b46e786dc3bd4b7aa3e93782b0ec895f','DELIVERED','2026-11-20 13:17:36.835650','2026-11-20 14:47:36.835650','ROOM_TEMPERATURE',NULL,1,1,1,17.4438,78.4939,'','Secunderabad, Hyderabad',68,'VEG','demo-history-v1-FRR-22363','2026-11-20 13:47:36.835650','2026-11-20 14:41:36.835650',0);
INSERT INTO "rescues" VALUES('a55f092cb918462ba6461fea6102f7bb','FRR-47356976','673c50c006ae477cbf99ec6ab6b6e181','OFFERED','2026-11-22 13:27:36.847668','2026-11-22 15:27:36.847668','HOT_HELD',NULL,1,1,1,17.4483,78.3915,'12-3 Silicon Valley, Madhapur','Madhapur, Hyderabad',200,'VEG','demo-scenario-split-202611221347','2026-11-22 13:47:36.847668','2026-11-22 13:49:27.929211',0);
INSERT INTO "rescues" VALUES('b050dcf687a04fd3af19603e6b67c623','FRR-41024187','3e7866beb6b6408296a7b8f3fd9cc991','OFFERED','2026-11-22 13:27:36.847668','2026-11-22 15:27:36.847668','ROOM_TEMPERATURE',NULL,1,1,1,17.4229,78.4079,'Road No 36, Jubilee Hills','Jubilee Hills, Hyderabad',40,'VEG','demo-scenario-bakery-202611221347','2026-11-22 13:47:36.847668','2026-11-22 13:49:27.953267',0);
INSERT INTO "rescues" VALUES('2cdc276eb9224dab9a741233374a59e2','FRR-94345053','e3b473430dc54f7dab07cafbf5d125a8','MATCHING','2026-11-22 13:27:36.847668','2026-11-22 15:27:36.847668','REFRIGERATED',NULL,1,1,1,17.4126,78.4499,'Road No 12, Banjara Hills','Banjara Hills, Hyderabad',35,'VEG','demo-scenario-cold-202611221347','2026-11-22 13:47:36.847668','2026-11-22 13:49:27.893214',0);
INSERT INTO "rescues" VALUES('f940f626151c4d1da3da3067ef32c324','FRR-51910704','371484f32906439cb0277a8738663b60','CLAIMED','2026-11-22 13:27:36.847668','2026-11-22 15:27:36.847668','HOT_HELD',NULL,1,0,1,17.4619,78.3564,'Plot 7, Kondapur','Kondapur, Hyderabad',45,'VEG','demo-scenario-support-202611221347','2026-11-22 13:47:36.847668','2026-11-22 13:47:36.858603',0);
CREATE TABLE status_events (
	id CHAR(32) NOT NULL, 
	rescue_id CHAR(32) NOT NULL, 
	actor_user_id CHAR(32), 
	from_status VARCHAR(20), 
	to_status VARCHAR(20) NOT NULL, 
	reason VARCHAR(300), 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_status_events PRIMARY KEY (id), 
	CONSTRAINT fk_status_events_rescue_id_rescues FOREIGN KEY(rescue_id) REFERENCES rescues (id) ON DELETE CASCADE, 
	CONSTRAINT fk_status_events_actor_user_id_users FOREIGN KEY(actor_user_id) REFERENCES users (id) ON DELETE SET NULL
);
INSERT INTO "status_events" VALUES('8c3af2d3f51e4ec3961d717e60ee22c3','8210817870d64463b750dec5bd800613',NULL,NULL,'POSTED',NULL,'2026-11-21 19:39:19.449040');
INSERT INTO "status_events" VALUES('7f9a03a2c2a040cd8cd85969e44c4927','8210817870d64463b750dec5bd800613',NULL,'POSTED','MATCHING','matching_started','2026-11-21 20:17:44.052243');
INSERT INTO "status_events" VALUES('aefd0bc8bf4f44dda9afc500217cb9e5','8210817870d64463b750dec5bd800613',NULL,'MATCHING','MATCHING','no_feasible_candidates','2026-11-21 20:17:44.054845');
INSERT INTO "status_events" VALUES('68a0fc70241b4582887eb44a0d84a7c7','d4d8ced75f3c43bf90478b349b3a646b','ff2333fcd59c429dbdc22232221b78cf',NULL,'POSTED',NULL,'2026-11-21 20:18:51.316373');
INSERT INTO "status_events" VALUES('5012e82d9f4a434b8fb7c2854789379d','d4d8ced75f3c43bf90478b349b3a646b','ff2333fcd59c429dbdc22232221b78cf','POSTED','MATCHING',NULL,'2026-11-21 20:18:51.322263');
INSERT INTO "status_events" VALUES('7f493d73e1cb4e28a7d0278debda71ab','d4d8ced75f3c43bf90478b349b3a646b',NULL,'MATCHING','OFFERED','offer_sent','2026-11-21 20:18:51.327583');
INSERT INTO "status_events" VALUES('4ee2977076934ed5a672908315fc60b3','d4d8ced75f3c43bf90478b349b3a646b','235c5679a2ce40458ad9616f9ffa0116','OFFERED','CLAIMED','claimed_by_receiver','2026-11-21 20:19:53.015758');
INSERT INTO "status_events" VALUES('df2ed9e4ef684335b3b417d8b3cdf96d','d4d8ced75f3c43bf90478b349b3a646b','235c5679a2ce40458ad9616f9ffa0116','CLAIMED','COLLECTED',NULL,'2026-11-21 20:28:53.913505');
INSERT INTO "status_events" VALUES('693214c8c6f04504832587c1e2441566','d4d8ced75f3c43bf90478b349b3a646b','235c5679a2ce40458ad9616f9ffa0116','COLLECTED','DELIVERED',NULL,'2026-11-21 20:29:10.321146');
INSERT INTO "status_events" VALUES('a7be7e3a6f0e46cba24979c711112c54','8210817870d64463b750dec5bd800613',NULL,'MATCHING','EXPIRED','pickup_window_ended','2026-11-21 20:31:21.670297');
INSERT INTO "status_events" VALUES('e12ab86d518642e29a0e9b640de3d9f0','80b1d375280c4eee9142635bc12a5e95','ff2333fcd59c429dbdc22232221b78cf',NULL,'POSTED',NULL,'2026-11-22 11:06:08.929470');
INSERT INTO "status_events" VALUES('165613d348234983b13eadc4a43a7bdc','80b1d375280c4eee9142635bc12a5e95','ff2333fcd59c429dbdc22232221b78cf','POSTED','MATCHING',NULL,'2026-11-22 11:06:08.946442');
INSERT INTO "status_events" VALUES('f8d0d601cac2450a959f510ed8f25ad2','80b1d375280c4eee9142635bc12a5e95',NULL,'MATCHING','OFFERED','offer_sent','2026-11-22 11:06:08.963052');
INSERT INTO "status_events" VALUES('b8da05a897db43d8b6b0c66bf0b14f0b','aafbb036e0214637b88d0a38f3dfd428',NULL,NULL,'POSTED',NULL,'2026-10-25 11:40:49.469152');
INSERT INTO "status_events" VALUES('b8208db2365a461ea7afdcf3afe8f816','aafbb036e0214637b88d0a38f3dfd428',NULL,'POSTED','MATCHING',NULL,'2026-10-25 11:41:49.469152');
INSERT INTO "status_events" VALUES('018bbaa42bd1410a9990427127ba43a0','aafbb036e0214637b88d0a38f3dfd428',NULL,'MATCHING','OFFERED',NULL,'2026-10-25 11:44:49.469152');
INSERT INTO "status_events" VALUES('0f3b9bc0f0b24e3d9ebac96ad9af816b','aafbb036e0214637b88d0a38f3dfd428',NULL,'OFFERED','CLAIMED',NULL,'2026-10-25 11:45:49.469152');
INSERT INTO "status_events" VALUES('5fbe31c4e06843a8b82382f21d4e7c0e','aafbb036e0214637b88d0a38f3dfd428',NULL,'CLAIMED','COLLECTED',NULL,'2026-10-25 12:07:49.469152');
INSERT INTO "status_events" VALUES('b79d1314403a4084920782e2991cd893','aafbb036e0214637b88d0a38f3dfd428',NULL,'COLLECTED','DELIVERED',NULL,'2026-10-25 12:21:49.469152');
INSERT INTO "status_events" VALUES('f95612bfc6bf4b3581ca390716e3efff','f063e8f9e0cc4dee9544d027d2d14e6c',NULL,NULL,'POSTED',NULL,'2026-10-26 11:40:49.481371');
INSERT INTO "status_events" VALUES('bef3c69db9554f80a498ffbe5f89459a','f063e8f9e0cc4dee9544d027d2d14e6c',NULL,'POSTED','MATCHING',NULL,'2026-10-26 11:41:49.481371');
INSERT INTO "status_events" VALUES('2f41d79cd97d488b8545247498fe7156','f063e8f9e0cc4dee9544d027d2d14e6c',NULL,'MATCHING','OFFERED',NULL,'2026-10-26 11:44:49.481371');
INSERT INTO "status_events" VALUES('9d70e52c13564f2a9c32ed6c1ed4715e','f063e8f9e0cc4dee9544d027d2d14e6c',NULL,'OFFERED','CLAIMED',NULL,'2026-10-26 11:45:49.481371');
INSERT INTO "status_events" VALUES('988eec07c4d3466b8dbfb7c262a9014a','f063e8f9e0cc4dee9544d027d2d14e6c',NULL,'CLAIMED','COLLECTED',NULL,'2026-10-26 12:18:49.481371');
INSERT INTO "status_events" VALUES('47cd2af2b27b4f5ab235ac091601d0b2','f063e8f9e0cc4dee9544d027d2d14e6c',NULL,'COLLECTED','DELIVERED',NULL,'2026-10-26 12:41:49.481371');
INSERT INTO "status_events" VALUES('34a31b83c4e64805a064221371c5e739','be7c42b400d444298de28feb16e6794a',NULL,NULL,'POSTED',NULL,'2026-10-27 11:40:49.493821');
INSERT INTO "status_events" VALUES('8e06befafab946ea95f75024a085b4e2','be7c42b400d444298de28feb16e6794a',NULL,'POSTED','MATCHING',NULL,'2026-10-27 11:41:49.493821');
INSERT INTO "status_events" VALUES('aafd9f4498f74140aac44863094ba15a','be7c42b400d444298de28feb16e6794a',NULL,'MATCHING','EXPIRED',NULL,'2026-10-27 12:41:49.493821');
INSERT INTO "status_events" VALUES('9e0a2183782b489c9062ab3418003965','2c3a19aa6c9c4c34bd5f44521e5f2b90',NULL,NULL,'POSTED',NULL,'2026-10-28 11:40:49.497336');
INSERT INTO "status_events" VALUES('0c60fb1987404f05a81334db2220483d','2c3a19aa6c9c4c34bd5f44521e5f2b90',NULL,'POSTED','MATCHING',NULL,'2026-10-28 11:41:49.497336');
INSERT INTO "status_events" VALUES('f97eb6e280b24bdca22d4a52997ac260','2c3a19aa6c9c4c34bd5f44521e5f2b90',NULL,'MATCHING','OFFERED',NULL,'2026-10-28 11:44:49.497336');
INSERT INTO "status_events" VALUES('665236dbd5464f32830785ec9cf240ca','2c3a19aa6c9c4c34bd5f44521e5f2b90',NULL,'OFFERED','CLAIMED',NULL,'2026-10-28 11:45:49.497336');
INSERT INTO "status_events" VALUES('ed41a00d7d5f458dbbb3e8ad843ec587','2c3a19aa6c9c4c34bd5f44521e5f2b90',NULL,'CLAIMED','COLLECTED',NULL,'2026-10-28 12:22:49.497336');
INSERT INTO "status_events" VALUES('45b19c6271ee45f69cf48fff1290673c','2c3a19aa6c9c4c34bd5f44521e5f2b90',NULL,'COLLECTED','DELIVERED',NULL,'2026-10-28 12:52:49.497336');
INSERT INTO "status_events" VALUES('fcf7453ad78f473b8eb096cd8ab1be8e','71eac25bd95c4d38be8866954656f368',NULL,NULL,'POSTED',NULL,'2026-10-29 11:40:49.499343');
INSERT INTO "status_events" VALUES('02273e9440c64b04ad9c923f99589a8a','71eac25bd95c4d38be8866954656f368',NULL,'POSTED','MATCHING',NULL,'2026-10-29 11:41:49.499343');
INSERT INTO "status_events" VALUES('592cd9a2b1b54f43ba3d21a097e25237','71eac25bd95c4d38be8866954656f368',NULL,'MATCHING','OFFERED',NULL,'2026-10-29 11:44:49.499343');
INSERT INTO "status_events" VALUES('7f5f2eabd9e34098a7231773aeb464cc','71eac25bd95c4d38be8866954656f368',NULL,'OFFERED','CLAIMED',NULL,'2026-10-29 11:45:49.499343');
INSERT INTO "status_events" VALUES('84fec283225e4602804ac840bb0288bd','71eac25bd95c4d38be8866954656f368',NULL,'CLAIMED','COLLECTED',NULL,'2026-10-29 12:18:49.499343');
INSERT INTO "status_events" VALUES('e9cfa3bfc1224741a316385ca594bd9d','71eac25bd95c4d38be8866954656f368',NULL,'COLLECTED','DELIVERED',NULL,'2026-10-29 12:36:49.499343');
INSERT INTO "status_events" VALUES('f47818b883d0473ca91af8db4389c876','104c163e2c3c4c769c1e99d948d4f04a',NULL,NULL,'POSTED',NULL,'2026-10-30 11:40:49.503098');
INSERT INTO "status_events" VALUES('18a9b72d575f463084518a7d6f784b2d','104c163e2c3c4c769c1e99d948d4f04a',NULL,'POSTED','MATCHING',NULL,'2026-10-30 11:41:49.503098');
INSERT INTO "status_events" VALUES('29c2468fb7d4460c9a628c400b5cd3d0','104c163e2c3c4c769c1e99d948d4f04a',NULL,'MATCHING','CANCELLED',NULL,'2026-10-30 11:52:49.503098');
INSERT INTO "status_events" VALUES('1e869d8598f64e678cc9c4fc9d98552a','63764a16a2f94f5985b0f241c64e49a2',NULL,NULL,'POSTED',NULL,'2026-10-31 11:40:49.505105');
INSERT INTO "status_events" VALUES('88c036e9c5da4aada7bc3efcc9932be6','63764a16a2f94f5985b0f241c64e49a2',NULL,'POSTED','MATCHING',NULL,'2026-10-31 11:41:49.505105');
INSERT INTO "status_events" VALUES('ba6b790b15a84b1f8a7e2597a7855503','63764a16a2f94f5985b0f241c64e49a2',NULL,'MATCHING','OFFERED',NULL,'2026-10-31 11:44:49.505105');
INSERT INTO "status_events" VALUES('a2a1f2e1b95444c1b7896172faf1d8de','63764a16a2f94f5985b0f241c64e49a2',NULL,'OFFERED','CLAIMED',NULL,'2026-10-31 11:45:49.505105');
INSERT INTO "status_events" VALUES('723eb02cec624fe4b20bc13f8ecbda60','63764a16a2f94f5985b0f241c64e49a2',NULL,'CLAIMED','COLLECTED',NULL,'2026-10-31 12:02:49.505105');
INSERT INTO "status_events" VALUES('210c8f1b50d04b0092b1d137bea44d42','63764a16a2f94f5985b0f241c64e49a2',NULL,'COLLECTED','DELIVERED',NULL,'2026-10-31 12:24:49.505105');
INSERT INTO "status_events" VALUES('5a1a512eb0a6431d9a94b95ef6b0eab7','0a956c9afa1e4eca94660d9979dc7246',NULL,NULL,'POSTED',NULL,'2026-11-01 11:40:49.509118');
INSERT INTO "status_events" VALUES('cde92140d80641c7974da62708a0a313','0a956c9afa1e4eca94660d9979dc7246',NULL,'POSTED','MATCHING',NULL,'2026-11-01 11:41:49.509118');
INSERT INTO "status_events" VALUES('6d9df12d72bc4f9b88fcb8bf3630ccbf','0a956c9afa1e4eca94660d9979dc7246',NULL,'MATCHING','OFFERED',NULL,'2026-11-01 11:44:49.509118');
INSERT INTO "status_events" VALUES('a430e9077dc7467b8080df7e9758f2c3','0a956c9afa1e4eca94660d9979dc7246',NULL,'OFFERED','CLAIMED',NULL,'2026-11-01 11:45:49.509118');
INSERT INTO "status_events" VALUES('92aad8269f20456da2c209d61747416b','0a956c9afa1e4eca94660d9979dc7246',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-01 12:23:49.509118');
INSERT INTO "status_events" VALUES('4b41cdf43eb34d198bbf607c0c2fe480','0a956c9afa1e4eca94660d9979dc7246',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-01 12:47:49.509118');
INSERT INTO "status_events" VALUES('8cdf7cc4c43f49eaa3ad6bb745e6338e','44b8637a86c342b1a128369bb30905ee',NULL,NULL,'POSTED',NULL,'2026-11-02 11:40:49.513130');
INSERT INTO "status_events" VALUES('4a99bae6e2b84e979456d789852d1722','44b8637a86c342b1a128369bb30905ee',NULL,'POSTED','MATCHING',NULL,'2026-11-02 11:41:49.513130');
INSERT INTO "status_events" VALUES('dfdd682aa3af441fad8a838de3950f7a','44b8637a86c342b1a128369bb30905ee',NULL,'MATCHING','EXPIRED',NULL,'2026-11-02 12:41:49.513130');
INSERT INTO "status_events" VALUES('ed416606030444a9ae69a2101a2bde7a','2b05e25f288343f7bde09a8b72e1f726',NULL,NULL,'POSTED',NULL,'2026-11-03 11:40:49.513130');
INSERT INTO "status_events" VALUES('6ee49e3c644e4a0a8ee944d3ecce9154','2b05e25f288343f7bde09a8b72e1f726',NULL,'POSTED','MATCHING',NULL,'2026-11-03 11:41:49.513130');
INSERT INTO "status_events" VALUES('9af12af62f234105aa3d5be780a9d5c4','2b05e25f288343f7bde09a8b72e1f726',NULL,'MATCHING','OFFERED',NULL,'2026-11-03 11:44:49.513130');
INSERT INTO "status_events" VALUES('6b22ab1d3aec40e8b78bcf228af0a9d3','2b05e25f288343f7bde09a8b72e1f726',NULL,'OFFERED','CLAIMED',NULL,'2026-11-03 11:45:49.513130');
INSERT INTO "status_events" VALUES('e999e8e285c64595b54005c5f585320e','2b05e25f288343f7bde09a8b72e1f726',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-03 12:22:49.513130');
INSERT INTO "status_events" VALUES('4d8d6ebe04b5458197c760551f54d39f','2b05e25f288343f7bde09a8b72e1f726',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-03 12:34:49.513130');
INSERT INTO "status_events" VALUES('416cee8607a34d3aa2e354f4ce4d0761','88430e8bbb51485cbd71e367b36289b3',NULL,NULL,'POSTED',NULL,'2026-11-04 11:40:49.516884');
INSERT INTO "status_events" VALUES('284e8f40e6fc47faade5bb9e5b862b0b','88430e8bbb51485cbd71e367b36289b3',NULL,'POSTED','MATCHING',NULL,'2026-11-04 11:41:49.516884');
INSERT INTO "status_events" VALUES('5e9636ac9fa14d84b6fc526303bd9a70','88430e8bbb51485cbd71e367b36289b3',NULL,'MATCHING','OFFERED',NULL,'2026-11-04 11:44:49.516884');
INSERT INTO "status_events" VALUES('20a2b6857a91473d8ea07d8d975dcc01','88430e8bbb51485cbd71e367b36289b3',NULL,'OFFERED','CLAIMED',NULL,'2026-11-04 11:45:49.516884');
INSERT INTO "status_events" VALUES('76c43ceaca504f3b8be1c46a501df5c9','88430e8bbb51485cbd71e367b36289b3',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-04 12:07:49.516884');
INSERT INTO "status_events" VALUES('060cb77275c64cc4ae963bdc2359a585','88430e8bbb51485cbd71e367b36289b3',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-04 12:20:49.516884');
INSERT INTO "status_events" VALUES('865a72e73d374e5c9adc7c5d91d95476','df2433d620b24fd88c0e4e500fda458f',NULL,NULL,'POSTED',NULL,'2026-11-05 11:40:49.520898');
INSERT INTO "status_events" VALUES('7c3377bf6bf74fb6ba5dabe95291166c','df2433d620b24fd88c0e4e500fda458f',NULL,'POSTED','MATCHING',NULL,'2026-11-05 11:41:49.520898');
INSERT INTO "status_events" VALUES('e77412ea667f42139a7bf2c57484f4ef','df2433d620b24fd88c0e4e500fda458f',NULL,'MATCHING','OFFERED',NULL,'2026-11-05 11:44:49.520898');
INSERT INTO "status_events" VALUES('83f8163f8fbb48619ad43801fff71f00','df2433d620b24fd88c0e4e500fda458f',NULL,'OFFERED','CLAIMED',NULL,'2026-11-05 11:45:49.520898');
INSERT INTO "status_events" VALUES('d47af6571fa24fc09ed5ff2926f1896f','df2433d620b24fd88c0e4e500fda458f',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-05 12:11:49.520898');
INSERT INTO "status_events" VALUES('68e736c160a84bd4b438dfd8737eb680','df2433d620b24fd88c0e4e500fda458f',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-05 12:32:49.520898');
INSERT INTO "status_events" VALUES('934bae8f5f1045d697f848c3fec9c4ce','5a8b164702a24f5e93fcc64ef4e93a24',NULL,NULL,'POSTED',NULL,'2026-11-06 11:40:49.522904');
INSERT INTO "status_events" VALUES('f10d94ca00f94092bddd977283bb7647','5a8b164702a24f5e93fcc64ef4e93a24',NULL,'POSTED','MATCHING',NULL,'2026-11-06 11:41:49.522904');
INSERT INTO "status_events" VALUES('2f75b432e93146c59c128662f7dbc13b','5a8b164702a24f5e93fcc64ef4e93a24',NULL,'MATCHING','CANCELLED',NULL,'2026-11-06 11:44:49.522904');
INSERT INTO "status_events" VALUES('e714d1fdf5e749ddbe96c7f2661e6f1c','1d5891c2c4654266beba13c7989e001e',NULL,NULL,'POSTED',NULL,'2026-11-07 11:40:49.524911');
INSERT INTO "status_events" VALUES('b13922acb34a4fbe98cae8a3146d5713','1d5891c2c4654266beba13c7989e001e',NULL,'POSTED','MATCHING',NULL,'2026-11-07 11:41:49.524911');
INSERT INTO "status_events" VALUES('058c43ae41014c3094247ffa0cb06ff3','1d5891c2c4654266beba13c7989e001e',NULL,'MATCHING','OFFERED',NULL,'2026-11-07 11:44:49.524911');
INSERT INTO "status_events" VALUES('dc24081d474f414c9cf20ad63b9cf714','1d5891c2c4654266beba13c7989e001e',NULL,'OFFERED','CLAIMED',NULL,'2026-11-07 11:45:49.524911');
INSERT INTO "status_events" VALUES('0f06e22694f14d1ebc41566d64a2a69b','1d5891c2c4654266beba13c7989e001e',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-07 12:05:49.524911');
INSERT INTO "status_events" VALUES('01ea16b1219548ca9a070bcec8c35a6c','1d5891c2c4654266beba13c7989e001e',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-07 12:29:49.524911');
INSERT INTO "status_events" VALUES('59059aef94554107b80d0e6f1b465c23','5565127f2537483cb39250cd198c3f9e',NULL,NULL,'POSTED',NULL,'2026-11-08 11:40:49.526917');
INSERT INTO "status_events" VALUES('563b173921f1426ea8458afb7b8ff31e','5565127f2537483cb39250cd198c3f9e',NULL,'POSTED','MATCHING',NULL,'2026-11-08 11:41:49.526917');
INSERT INTO "status_events" VALUES('e8e9d1db523243f8adde9a3daeb991e8','5565127f2537483cb39250cd198c3f9e',NULL,'MATCHING','OFFERED',NULL,'2026-11-08 11:44:49.526917');
INSERT INTO "status_events" VALUES('393d4afe9b784e9e80f25f6e4e540351','5565127f2537483cb39250cd198c3f9e',NULL,'OFFERED','CLAIMED',NULL,'2026-11-08 11:45:49.526917');
INSERT INTO "status_events" VALUES('5979ab158495412a8ddf0d09e011f01f','5565127f2537483cb39250cd198c3f9e',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-08 12:24:49.526917');
INSERT INTO "status_events" VALUES('aa04bcae547649e3b78d467abda50456','5565127f2537483cb39250cd198c3f9e',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-08 12:35:49.526917');
INSERT INTO "status_events" VALUES('0a13b16b05464740a378503a3e060bf4','f12adf187e304159b93bbeea47bd61f1',NULL,NULL,'POSTED',NULL,'2026-11-09 11:40:49.528924');
INSERT INTO "status_events" VALUES('19e52a266e404c13b8084492138d7d28','f12adf187e304159b93bbeea47bd61f1',NULL,'POSTED','MATCHING',NULL,'2026-11-09 11:41:49.528924');
INSERT INTO "status_events" VALUES('49994c72e0214807b94bc392f624d534','f12adf187e304159b93bbeea47bd61f1',NULL,'MATCHING','OFFERED',NULL,'2026-11-09 11:44:49.528924');
INSERT INTO "status_events" VALUES('5e768b72693c44e29e0460930b415951','f12adf187e304159b93bbeea47bd61f1',NULL,'OFFERED','CLAIMED',NULL,'2026-11-09 11:45:49.528924');
INSERT INTO "status_events" VALUES('27b3fba1ad844d6e94c6e785c8a70286','f12adf187e304159b93bbeea47bd61f1',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-09 12:02:49.528924');
INSERT INTO "status_events" VALUES('be2c45e838f14280b89171b566f35b04','f12adf187e304159b93bbeea47bd61f1',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-09 12:18:49.528924');
INSERT INTO "status_events" VALUES('510c293c709243cea36ed20c22415faa','b32e178ab7ab4ab3ae9eaf66c3dd513c',NULL,NULL,'POSTED',NULL,'2026-11-10 11:40:49.534789');
INSERT INTO "status_events" VALUES('cf1c625216284e3188b9e92a8cddb5b6','b32e178ab7ab4ab3ae9eaf66c3dd513c',NULL,'POSTED','MATCHING',NULL,'2026-11-10 11:41:49.534789');
INSERT INTO "status_events" VALUES('e72d59a4f0dc47518213b7de8636897e','b32e178ab7ab4ab3ae9eaf66c3dd513c',NULL,'MATCHING','EXPIRED',NULL,'2026-11-10 14:41:49.534789');
INSERT INTO "status_events" VALUES('414ce4ca5fc54405bb757f3339087464','6670de0672d94e6e82cd6771f40ce080',NULL,NULL,'POSTED',NULL,'2026-11-11 11:40:49.536794');
INSERT INTO "status_events" VALUES('a188ee64442845e3a8a309d96b6d7956','6670de0672d94e6e82cd6771f40ce080',NULL,'POSTED','MATCHING',NULL,'2026-11-11 11:41:49.536794');
INSERT INTO "status_events" VALUES('b08ca08ebb904a2b9263bf7181e2ddf3','6670de0672d94e6e82cd6771f40ce080',NULL,'MATCHING','OFFERED',NULL,'2026-11-11 11:44:49.536794');
INSERT INTO "status_events" VALUES('3ed985efeda644cfa701f9cc3c0c26a6','6670de0672d94e6e82cd6771f40ce080',NULL,'OFFERED','CLAIMED',NULL,'2026-11-11 11:45:49.536794');
INSERT INTO "status_events" VALUES('08828ee88ab04dde99cff77e576677ef','6670de0672d94e6e82cd6771f40ce080',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-11 12:04:49.536794');
INSERT INTO "status_events" VALUES('a9bd6fda1a994acd85986db4bce0eeda','6670de0672d94e6e82cd6771f40ce080',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-11 12:22:49.536794');
INSERT INTO "status_events" VALUES('2603d3dd29b94e7b8efb5108d68561a7','7205a4ca36624411aea13209c774cc61',NULL,NULL,'POSTED',NULL,'2026-11-12 11:40:49.540804');
INSERT INTO "status_events" VALUES('19334685cd9a493c9d1be6770e054458','7205a4ca36624411aea13209c774cc61',NULL,'POSTED','MATCHING',NULL,'2026-11-12 11:41:49.540804');
INSERT INTO "status_events" VALUES('c65b071b5515414599508f86dd2522e2','7205a4ca36624411aea13209c774cc61',NULL,'MATCHING','OFFERED',NULL,'2026-11-12 11:44:49.540804');
INSERT INTO "status_events" VALUES('28cf7351682e4dcf8667297f908fe349','7205a4ca36624411aea13209c774cc61',NULL,'OFFERED','CLAIMED',NULL,'2026-11-12 11:45:49.540804');
INSERT INTO "status_events" VALUES('afe385de923a4cdfa6e57f9d7cc1eaeb','7205a4ca36624411aea13209c774cc61',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-12 12:23:49.540804');
INSERT INTO "status_events" VALUES('5af859759c544ae79a4e5d2628ba419e','7205a4ca36624411aea13209c774cc61',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-12 12:51:49.540804');
INSERT INTO "status_events" VALUES('173975df60e948598a66260af22a8781','e7121c3b44904ba59303f3e8dd767e4b',NULL,NULL,'POSTED',NULL,'2026-11-13 11:40:49.544633');
INSERT INTO "status_events" VALUES('16795df5d22847ebb07228cb4538204c','e7121c3b44904ba59303f3e8dd767e4b',NULL,'POSTED','MATCHING',NULL,'2026-11-13 11:41:49.544633');
INSERT INTO "status_events" VALUES('10a995a0a3994cdd904f5ab33d07a850','e7121c3b44904ba59303f3e8dd767e4b',NULL,'MATCHING','OFFERED',NULL,'2026-11-13 11:44:49.544633');
INSERT INTO "status_events" VALUES('5b1a3cfae03d424aa2727ed2f16adda1','e7121c3b44904ba59303f3e8dd767e4b',NULL,'OFFERED','CLAIMED',NULL,'2026-11-13 11:45:49.544633');
INSERT INTO "status_events" VALUES('b4e610825cda4c46b189ac9f01f4d40f','e7121c3b44904ba59303f3e8dd767e4b',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-13 12:04:49.544633');
INSERT INTO "status_events" VALUES('c0a33dda25af4b4dbf6a392c7a940fe9','e7121c3b44904ba59303f3e8dd767e4b',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-13 12:30:49.544633');
INSERT INTO "status_events" VALUES('4e3cb78cb741415c96f28a132b3e1249','aa8fcc5446304a53b9a3f6ece0f96884',NULL,NULL,'POSTED',NULL,'2026-11-14 11:40:49.548648');
INSERT INTO "status_events" VALUES('b033179ddf16445c97a89a390229ee5c','aa8fcc5446304a53b9a3f6ece0f96884',NULL,'POSTED','MATCHING',NULL,'2026-11-14 11:41:49.548648');
INSERT INTO "status_events" VALUES('e1e2b211cde74b478bc752f1a13bf767','aa8fcc5446304a53b9a3f6ece0f96884',NULL,'MATCHING','CANCELLED',NULL,'2026-11-14 11:45:49.548648');
INSERT INTO "status_events" VALUES('0ff490de5be54d409f524afa5a5d8930','d11a83cbba4543a4810d8adf5d3980df',NULL,NULL,'POSTED',NULL,'2026-11-15 11:40:49.548648');
INSERT INTO "status_events" VALUES('10e82dd5382741e092edcef9544c871c','d11a83cbba4543a4810d8adf5d3980df',NULL,'POSTED','MATCHING',NULL,'2026-11-15 11:41:49.548648');
INSERT INTO "status_events" VALUES('5ea7e0c3c4774717ae9edfc7264db5cd','d11a83cbba4543a4810d8adf5d3980df',NULL,'MATCHING','OFFERED',NULL,'2026-11-15 11:44:49.548648');
INSERT INTO "status_events" VALUES('30dc7c50ea9b4a2691be5c7b0f93787e','d11a83cbba4543a4810d8adf5d3980df',NULL,'OFFERED','CLAIMED',NULL,'2026-11-15 11:45:49.548648');
INSERT INTO "status_events" VALUES('80314da7e1fe4c06b94e58e011c887a2','d11a83cbba4543a4810d8adf5d3980df',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-15 12:12:49.548648');
INSERT INTO "status_events" VALUES('9f9b167527444b1a9ae4ef59dca4997a','d11a83cbba4543a4810d8adf5d3980df',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-15 12:34:49.548648');
INSERT INTO "status_events" VALUES('85f9a389c1f949e0819e92a38cac4d18','d98dd7a0d2394bd3bea09cf868f0a500',NULL,NULL,'POSTED',NULL,'2026-11-16 11:40:49.553584');
INSERT INTO "status_events" VALUES('2dfb4cbdeb1c40b58e609883b5af142b','d98dd7a0d2394bd3bea09cf868f0a500',NULL,'POSTED','MATCHING',NULL,'2026-11-16 11:41:49.553584');
INSERT INTO "status_events" VALUES('3eb0f573250c4547ade3798beea53aaa','d98dd7a0d2394bd3bea09cf868f0a500',NULL,'MATCHING','OFFERED',NULL,'2026-11-16 11:44:49.553584');
INSERT INTO "status_events" VALUES('87ab132a65a544d88fffce221304f180','d98dd7a0d2394bd3bea09cf868f0a500',NULL,'OFFERED','CLAIMED',NULL,'2026-11-16 11:45:49.553584');
INSERT INTO "status_events" VALUES('fc548e9c7d0a4e65b3cb577bf5ebbdc2','d98dd7a0d2394bd3bea09cf868f0a500',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-16 12:21:49.553584');
INSERT INTO "status_events" VALUES('3223295ba0044795b2113170af60166a','d98dd7a0d2394bd3bea09cf868f0a500',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-16 12:34:49.553584');
INSERT INTO "status_events" VALUES('70d2597fe7e5435f916fbe8f87413b68','7412580afaa94eecb1829e2b084c94d6',NULL,NULL,'POSTED',NULL,'2026-11-17 11:40:49.553584');
INSERT INTO "status_events" VALUES('ddc1bf3a25934189b1ef68c303e800c1','7412580afaa94eecb1829e2b084c94d6',NULL,'POSTED','MATCHING',NULL,'2026-11-17 11:41:49.553584');
INSERT INTO "status_events" VALUES('d6d7f9553a0a4f4ba6f8ad268546d27c','7412580afaa94eecb1829e2b084c94d6',NULL,'MATCHING','OFFERED',NULL,'2026-11-17 11:44:49.553584');
INSERT INTO "status_events" VALUES('f31be10c946c40e384c60f8ca0b335c6','7412580afaa94eecb1829e2b084c94d6',NULL,'OFFERED','CLAIMED',NULL,'2026-11-17 11:45:49.553584');
INSERT INTO "status_events" VALUES('194dd0861c5c4e7f87dca8c126f205b9','7412580afaa94eecb1829e2b084c94d6',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-17 12:09:49.553584');
INSERT INTO "status_events" VALUES('f6871198765348a688d775918067bd3e','7412580afaa94eecb1829e2b084c94d6',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-17 12:32:49.553584');
INSERT INTO "status_events" VALUES('4cf7ecb987f24cc9a713b9b262fdfe7e','b9bfa897a1a5432daa69cfa7d5e3fc77',NULL,NULL,'POSTED',NULL,'2026-11-18 11:40:49.553584');
INSERT INTO "status_events" VALUES('fdfe20b3ac7742629a72a3cfa7ab2738','b9bfa897a1a5432daa69cfa7d5e3fc77',NULL,'POSTED','MATCHING',NULL,'2026-11-18 11:41:49.553584');
INSERT INTO "status_events" VALUES('45221140efe04e15938e8f1a38ad7c13','b9bfa897a1a5432daa69cfa7d5e3fc77',NULL,'MATCHING','OFFERED',NULL,'2026-11-18 11:44:49.553584');
INSERT INTO "status_events" VALUES('3c5f2f067f3e4f5f8442535a9df61a5b','b9bfa897a1a5432daa69cfa7d5e3fc77',NULL,'OFFERED','CLAIMED',NULL,'2026-11-18 11:45:49.553584');
INSERT INTO "status_events" VALUES('aeafa9fc5205441ba36c439601797904','b9bfa897a1a5432daa69cfa7d5e3fc77',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-18 12:24:49.553584');
INSERT INTO "status_events" VALUES('b0515c2d38cf4d0aa1c2741ab4ccfd5f','b9bfa897a1a5432daa69cfa7d5e3fc77',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-18 12:39:49.553584');
INSERT INTO "status_events" VALUES('c94640fe23a2460589d0da22a02b8e4d','3db6520ac6924dfdb18880008afad9fc',NULL,NULL,'POSTED',NULL,'2026-11-19 11:40:49.566136');
INSERT INTO "status_events" VALUES('2e66a0df292d4749b6292b27a8a49b6c','3db6520ac6924dfdb18880008afad9fc',NULL,'POSTED','MATCHING',NULL,'2026-11-19 11:41:49.566136');
INSERT INTO "status_events" VALUES('f642d69ceba84a1eaa0ccc146de261dd','3db6520ac6924dfdb18880008afad9fc',NULL,'MATCHING','EXPIRED',NULL,'2026-11-19 12:41:49.566136');
INSERT INTO "status_events" VALUES('42376a9856af41938929199bbf6acd55','fbd531e93ce143ea8c93014225d36840',NULL,NULL,'POSTED',NULL,'2026-11-20 11:40:49.568142');
INSERT INTO "status_events" VALUES('dd6702b9df9945debc03d9188c0b0ea3','fbd531e93ce143ea8c93014225d36840',NULL,'POSTED','MATCHING',NULL,'2026-11-20 11:41:49.568142');
INSERT INTO "status_events" VALUES('cbfbb633a77143fea8fa2a75fa5a4479','fbd531e93ce143ea8c93014225d36840',NULL,'MATCHING','OFFERED',NULL,'2026-11-20 11:44:49.568142');
INSERT INTO "status_events" VALUES('15de2ddb26a94f94b25446753c20a43c','fbd531e93ce143ea8c93014225d36840',NULL,'OFFERED','CLAIMED',NULL,'2026-11-20 11:45:49.568142');
INSERT INTO "status_events" VALUES('1de2e1b9ff49431bbcef06ad4edb9c3e','fbd531e93ce143ea8c93014225d36840',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-20 12:11:49.568142');
INSERT INTO "status_events" VALUES('effe8b345ea4454cbaae9dee969b4c83','fbd531e93ce143ea8c93014225d36840',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-20 12:26:49.568142');
INSERT INTO "status_events" VALUES('6b8e2a8727cc4abda533e3179a4f3863','e2431930941047acabafa75d5916eb99',NULL,NULL,'POSTED',NULL,'2026-11-20 23:40:49.570625');
INSERT INTO "status_events" VALUES('f0d16e8d3861448bbfe230d55365b753','e2431930941047acabafa75d5916eb99',NULL,'POSTED','MATCHING',NULL,'2026-11-20 23:41:49.570625');
INSERT INTO "status_events" VALUES('d36a285b7ecd4fcab95fc707108c27d3','e2431930941047acabafa75d5916eb99',NULL,'MATCHING','OFFERED',NULL,'2026-11-20 23:44:49.570625');
INSERT INTO "status_events" VALUES('7c1b1246de59490fb37e3292d31b6658','e2431930941047acabafa75d5916eb99',NULL,'OFFERED','CLAIMED',NULL,'2026-11-20 23:45:49.570625');
INSERT INTO "status_events" VALUES('f453bbd0d2a745bda7f7261037ebf83e','e2431930941047acabafa75d5916eb99',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-21 00:00:49.570625');
INSERT INTO "status_events" VALUES('d1ee3a440dc84d12962ff8ea9565431d','e2431930941047acabafa75d5916eb99',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-21 00:13:49.570625');
INSERT INTO "status_events" VALUES('b88ca6ce042f4bb195780f6bec75357a','be65a257723947b586cd3fe47a0c08e1',NULL,NULL,'POSTED',NULL,'2026-11-21 11:40:49.573205');
INSERT INTO "status_events" VALUES('bc48dc20e3644cae82cf4a2b6f7bbaf8','be65a257723947b586cd3fe47a0c08e1',NULL,'POSTED','MATCHING',NULL,'2026-11-21 11:41:49.573205');
INSERT INTO "status_events" VALUES('8b260bcae278475fb0a091cbce2df1e7','be65a257723947b586cd3fe47a0c08e1',NULL,'MATCHING','OFFERED',NULL,'2026-11-21 11:44:49.573205');
INSERT INTO "status_events" VALUES('478792dde47b41ffb6d9b07bcc31e30a','be65a257723947b586cd3fe47a0c08e1',NULL,'OFFERED','CLAIMED',NULL,'2026-11-21 11:45:49.573205');
INSERT INTO "status_events" VALUES('542615f717544ebbb66eb54ef1afc561','be65a257723947b586cd3fe47a0c08e1',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-21 12:18:49.573205');
INSERT INTO "status_events" VALUES('b0bc49ad649241a1bc873e0ee1b9c057','be65a257723947b586cd3fe47a0c08e1',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-21 12:30:49.573205');
INSERT INTO "status_events" VALUES('1242a09d06a24f758f55b38a6f8ef717','20466b025596421289b38aab49db7e9f',NULL,NULL,'POSTED',NULL,'2026-11-21 23:40:49.573205');
INSERT INTO "status_events" VALUES('38f56456b79440fd97121694216d7fde','20466b025596421289b38aab49db7e9f',NULL,'POSTED','MATCHING',NULL,'2026-11-21 23:41:49.573205');
INSERT INTO "status_events" VALUES('8c14aef9af6b418180a038abf21944ae','20466b025596421289b38aab49db7e9f',NULL,'MATCHING','OFFERED',NULL,'2026-11-21 23:44:49.573205');
INSERT INTO "status_events" VALUES('0ec9094e17324db0a59bb359c96a29b4','20466b025596421289b38aab49db7e9f',NULL,'OFFERED','CLAIMED',NULL,'2026-11-21 23:45:49.573205');
INSERT INTO "status_events" VALUES('5f7e77b57f054d87834a47fa7494c3b4','20466b025596421289b38aab49db7e9f',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-22 00:04:49.573205');
INSERT INTO "status_events" VALUES('f86b7b81802e4ad1bc1838bf3b6dc868','20466b025596421289b38aab49db7e9f',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-22 00:29:49.573205');
INSERT INTO "status_events" VALUES('fbf54242ad154b61aaa5fc32c57c82bd','d4074ba1840641cd9eba63433361191d',NULL,NULL,'POSTED',NULL,'2026-11-22 11:40:49.588018');
INSERT INTO "status_events" VALUES('b3e72d22ddfd479e894c2959b6efa094','a79b62eab9bb4df3b30f808a6b57069e',NULL,NULL,'POSTED',NULL,'2026-11-22 11:40:49.588018');
INSERT INTO "status_events" VALUES('42b81c7827c14ea682cd68be8bcc6ee0','b0ca2b6f18b648c2bd4f9c422e5fcd17',NULL,NULL,'POSTED',NULL,'2026-11-22 11:40:49.588018');
INSERT INTO "status_events" VALUES('28f6f2cf848741d99bcfb00d46c185bb','acd9397963294c2d9932bc9fb15208ed',NULL,NULL,'POSTED',NULL,'2026-11-22 11:40:49.588018');
INSERT INTO "status_events" VALUES('9e0f52d93ab64fea97b14054e12a734b','acd9397963294c2d9932bc9fb15208ed',NULL,'POSTED','CLAIMED',NULL,'2026-11-22 11:40:49.588019');
INSERT INTO "status_events" VALUES('61f811bf730f403dac8c7d53ea6435b1','a79b62eab9bb4df3b30f808a6b57069e',NULL,'POSTED','MATCHING','matching_started','2026-11-22 11:41:07.503092');
INSERT INTO "status_events" VALUES('0c45be36556348b48f19494f76dcd868','a79b62eab9bb4df3b30f808a6b57069e',NULL,'MATCHING','OFFERED','offer_sent','2026-11-22 11:41:07.510434');
INSERT INTO "status_events" VALUES('3fa473daa01049458af473c861698928','b0ca2b6f18b648c2bd4f9c422e5fcd17',NULL,'POSTED','MATCHING','matching_started','2026-11-22 11:41:07.517754');
INSERT INTO "status_events" VALUES('0ff765d9db3748d983e156a422a9f7ec','b0ca2b6f18b648c2bd4f9c422e5fcd17',NULL,'MATCHING','MATCHING','no_feasible_candidates','2026-11-22 11:41:07.517754');
INSERT INTO "status_events" VALUES('d4bb7fca275a459fac1610a45abd4156','d4074ba1840641cd9eba63433361191d',NULL,'POSTED','MATCHING','matching_started','2026-11-22 11:41:07.534350');
INSERT INTO "status_events" VALUES('6bf978a49c2d4c76b4cf351fec1354b4','d4074ba1840641cd9eba63433361191d',NULL,'MATCHING','OFFERED','offer_sent','2026-11-22 11:41:07.534350');
INSERT INTO "status_events" VALUES('073c863fe42743ab828df29979940a60','b0ca2b6f18b648c2bd4f9c422e5fcd17',NULL,'MATCHING','MATCHING','no_feasible_candidates','2026-11-22 11:41:09.337102');
INSERT INTO "status_events" VALUES('0a741474b2c64077bf3ec48c73621cd0','d4074ba1840641cd9eba63433361191d',NULL,'OFFERED','MATCHING','no_candidates_remaining','2026-11-22 11:51:46.398355');
INSERT INTO "status_events" VALUES('0b7346bbb31d46b8ae87a3e67c941649','a0c004756f244f9a8a64332d51962f7b','ff2333fcd59c429dbdc22232221b78cf',NULL,'POSTED',NULL,'2026-11-22 11:54:57.832566');
INSERT INTO "status_events" VALUES('770429fb7a2247c5a2b283475fb07413','a0c004756f244f9a8a64332d51962f7b','ff2333fcd59c429dbdc22232221b78cf','POSTED','MATCHING',NULL,'2026-11-22 11:54:57.841087');
INSERT INTO "status_events" VALUES('9747692087cc4e4fbb56959d7236a742','a0c004756f244f9a8a64332d51962f7b',NULL,'MATCHING','OFFERED','offer_sent','2026-11-22 11:54:57.849635');
INSERT INTO "status_events" VALUES('5b7061e12bd24f65ae2a6ea902f68c32','80b1d375280c4eee9142635bc12a5e95',NULL,'OFFERED','MATCHING','no_candidates_remaining','2026-11-22 12:02:02.607591');
INSERT INTO "status_events" VALUES('a7de88d82242472c98019b86f5def9a3','6b041b6fd63041359ae80d0bfa255cbf',NULL,NULL,'POSTED',NULL,'2026-10-26 13:47:36.793862');
INSERT INTO "status_events" VALUES('f2781a2579554bc8897c893a77e96405','6b041b6fd63041359ae80d0bfa255cbf',NULL,'POSTED','MATCHING',NULL,'2026-10-26 13:48:36.793862');
INSERT INTO "status_events" VALUES('812fe5011d0c4e29a2db80b38618e5f9','6b041b6fd63041359ae80d0bfa255cbf',NULL,'MATCHING','OFFERED',NULL,'2026-10-26 13:51:36.793862');
INSERT INTO "status_events" VALUES('d835759ff6074b41a1c9414688702ec8','6b041b6fd63041359ae80d0bfa255cbf',NULL,'OFFERED','CLAIMED',NULL,'2026-10-26 13:52:36.793862');
INSERT INTO "status_events" VALUES('f94a3a218b914338b23fb83ead1fba33','6b041b6fd63041359ae80d0bfa255cbf',NULL,'CLAIMED','COLLECTED',NULL,'2026-10-26 14:13:36.793862');
INSERT INTO "status_events" VALUES('06bcfb3722ef4664b7c0e947cf30f3f5','6b041b6fd63041359ae80d0bfa255cbf',NULL,'COLLECTED','DELIVERED',NULL,'2026-10-26 14:40:36.793862');
INSERT INTO "status_events" VALUES('1df0ac969cf2466999f89a2e6bff577f','73492940f9f04e1b83969e60d0ed741f',NULL,NULL,'POSTED',NULL,'2026-10-28 13:47:36.802555');
INSERT INTO "status_events" VALUES('d550ddacdd3148018d960ec51af57b89','73492940f9f04e1b83969e60d0ed741f',NULL,'POSTED','MATCHING',NULL,'2026-10-28 13:48:36.802555');
INSERT INTO "status_events" VALUES('4735b6f949744a26b1705ec68045ca18','73492940f9f04e1b83969e60d0ed741f',NULL,'MATCHING','OFFERED',NULL,'2026-10-28 13:51:36.802555');
INSERT INTO "status_events" VALUES('fa2f863ccb1e46038bb128418746c886','73492940f9f04e1b83969e60d0ed741f',NULL,'OFFERED','CLAIMED',NULL,'2026-10-28 13:52:36.802555');
INSERT INTO "status_events" VALUES('c4ac4e5d669a480f8a7a75cfd7d2541d','73492940f9f04e1b83969e60d0ed741f',NULL,'CLAIMED','COLLECTED',NULL,'2026-10-28 14:28:36.802555');
INSERT INTO "status_events" VALUES('bc70e96dd85144828b8d19c47c50f982','73492940f9f04e1b83969e60d0ed741f',NULL,'COLLECTED','DELIVERED',NULL,'2026-10-28 14:58:36.802555');
INSERT INTO "status_events" VALUES('2d360923c6f941e7b659d8533d6dc6b9','2e0d2bad97d14223bfad11ee23a3abe4',NULL,NULL,'POSTED',NULL,'2026-11-01 13:47:36.808936');
INSERT INTO "status_events" VALUES('95afb59dbfef4ce59826c442f764b094','2e0d2bad97d14223bfad11ee23a3abe4',NULL,'POSTED','MATCHING',NULL,'2026-11-01 13:48:36.808936');
INSERT INTO "status_events" VALUES('1fcf02e983444653bbd515cf2ade0d41','2e0d2bad97d14223bfad11ee23a3abe4',NULL,'MATCHING','OFFERED',NULL,'2026-11-01 13:51:36.808936');
INSERT INTO "status_events" VALUES('5afb49548ade4281a1030ff6bf8cc339','2e0d2bad97d14223bfad11ee23a3abe4',NULL,'OFFERED','CLAIMED',NULL,'2026-11-01 13:52:36.808936');
INSERT INTO "status_events" VALUES('7572cc62f86f4743973b950639707000','2e0d2bad97d14223bfad11ee23a3abe4',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-01 14:14:36.808936');
INSERT INTO "status_events" VALUES('5e84bd6f8e0b474e9427c3ea511a39a4','2e0d2bad97d14223bfad11ee23a3abe4',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-01 14:31:36.808936');
INSERT INTO "status_events" VALUES('6c3e1ff44d5240b08930cb82468b50e2','6943a4b58ea2488cbf92e8be2541b84f',NULL,NULL,'POSTED',NULL,'2026-11-05 13:47:36.817635');
INSERT INTO "status_events" VALUES('cf9bc37b03784f0e964dcb34dba3bc4b','6943a4b58ea2488cbf92e8be2541b84f',NULL,'POSTED','MATCHING',NULL,'2026-11-05 13:48:36.817635');
INSERT INTO "status_events" VALUES('43d5fdec67944c09b87c4c57c1b2d94f','6943a4b58ea2488cbf92e8be2541b84f',NULL,'MATCHING','OFFERED',NULL,'2026-11-05 13:51:36.817635');
INSERT INTO "status_events" VALUES('a20e7765962d4dc5b3497017c42ff603','6943a4b58ea2488cbf92e8be2541b84f',NULL,'OFFERED','CLAIMED',NULL,'2026-11-05 13:52:36.817635');
INSERT INTO "status_events" VALUES('c543cbaf8bf74723965e5a8efc42c0dc','6943a4b58ea2488cbf92e8be2541b84f',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-05 14:07:36.817635');
INSERT INTO "status_events" VALUES('abed508891454d6b8a5c6d7f2e70b337','6943a4b58ea2488cbf92e8be2541b84f',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-05 14:19:36.817635');
INSERT INTO "status_events" VALUES('2bafbfbae55d4c64bf1385271b829b5c','cb912efcf76d428cb9cf5133502d32ee',NULL,NULL,'POSTED',NULL,'2026-11-09 13:47:36.822200');
INSERT INTO "status_events" VALUES('e721cbdf2d4a4419aba1b97744e9ccc5','cb912efcf76d428cb9cf5133502d32ee',NULL,'POSTED','MATCHING',NULL,'2026-11-09 13:48:36.822200');
INSERT INTO "status_events" VALUES('d5a3582701bd46afbca9e3f48da67d4f','cb912efcf76d428cb9cf5133502d32ee',NULL,'MATCHING','OFFERED',NULL,'2026-11-09 13:51:36.822200');
INSERT INTO "status_events" VALUES('dde20880486d4c38aa080eab5bf640ef','cb912efcf76d428cb9cf5133502d32ee',NULL,'OFFERED','CLAIMED',NULL,'2026-11-09 13:52:36.822200');
INSERT INTO "status_events" VALUES('cfbfe07a4f9f41e98f834ad0cb665e99','cb912efcf76d428cb9cf5133502d32ee',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-09 14:08:36.822200');
INSERT INTO "status_events" VALUES('addde2eb79a54187b9d1886c0bef03b2','cb912efcf76d428cb9cf5133502d32ee',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-09 14:28:36.822200');
INSERT INTO "status_events" VALUES('2382b48ca7e84ed4a9ed3ea4dc4d7586','14259bc927264ba7b76b4b84520f96a6',NULL,NULL,'POSTED',NULL,'2026-11-13 13:47:36.826871');
INSERT INTO "status_events" VALUES('f6076725d76f4c618575d0a59300487f','14259bc927264ba7b76b4b84520f96a6',NULL,'POSTED','MATCHING',NULL,'2026-11-13 13:48:36.826871');
INSERT INTO "status_events" VALUES('0157fab00ebd4f6d85dbdf5a4bdcb2bb','14259bc927264ba7b76b4b84520f96a6',NULL,'MATCHING','OFFERED',NULL,'2026-11-13 13:51:36.826871');
INSERT INTO "status_events" VALUES('0277071bdfe74ecba20e3d469a953902','14259bc927264ba7b76b4b84520f96a6',NULL,'OFFERED','CLAIMED',NULL,'2026-11-13 13:52:36.826871');
INSERT INTO "status_events" VALUES('df2c3c3cb90246e6af07ddfed0fc2bce','14259bc927264ba7b76b4b84520f96a6',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-13 14:13:36.826871');
INSERT INTO "status_events" VALUES('610a86fb45884eceafaebe0c71d5c0a8','14259bc927264ba7b76b4b84520f96a6',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-13 14:40:36.826871');
INSERT INTO "status_events" VALUES('c19ec4234d1441e58f4d29b834897655','ebc193ab8b9f4c7cac681989a8fd4475',NULL,NULL,'POSTED',NULL,'2026-11-17 13:47:36.831905');
INSERT INTO "status_events" VALUES('be18ab1b9f9e4d29a422283320923249','ebc193ab8b9f4c7cac681989a8fd4475',NULL,'POSTED','MATCHING',NULL,'2026-11-17 13:48:36.831905');
INSERT INTO "status_events" VALUES('626cf9595f9c48edb8b245833a800f3b','ebc193ab8b9f4c7cac681989a8fd4475',NULL,'MATCHING','OFFERED',NULL,'2026-11-17 13:51:36.831905');
INSERT INTO "status_events" VALUES('3e5961d3ad3c4070ac76a496e02594b2','ebc193ab8b9f4c7cac681989a8fd4475',NULL,'OFFERED','CLAIMED',NULL,'2026-11-17 13:52:36.831905');
INSERT INTO "status_events" VALUES('9a1377f947694f5caee6164968f134e1','ebc193ab8b9f4c7cac681989a8fd4475',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-17 14:32:36.831905');
INSERT INTO "status_events" VALUES('06d042970857402f99db469622a17e70','ebc193ab8b9f4c7cac681989a8fd4475',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-17 14:57:36.831905');
INSERT INTO "status_events" VALUES('1c5ca4355a39467884b7e281504012c1','1ff5a035f9844d2e8df0c42a0279732a',NULL,NULL,'POSTED',NULL,'2026-11-20 13:47:36.835650');
INSERT INTO "status_events" VALUES('5a1ca77315894abfab5a4db7d6cba0f6','1ff5a035f9844d2e8df0c42a0279732a',NULL,'POSTED','MATCHING',NULL,'2026-11-20 13:48:36.835650');
INSERT INTO "status_events" VALUES('f4c9c64301314f8692dd91b8993d8448','1ff5a035f9844d2e8df0c42a0279732a',NULL,'MATCHING','OFFERED',NULL,'2026-11-20 13:51:36.835650');
INSERT INTO "status_events" VALUES('7481aa652baf4d0d949be2759206717b','1ff5a035f9844d2e8df0c42a0279732a',NULL,'OFFERED','CLAIMED',NULL,'2026-11-20 13:52:36.835650');
INSERT INTO "status_events" VALUES('88bdda39ae0a46918ba4bbfc863c6062','1ff5a035f9844d2e8df0c42a0279732a',NULL,'CLAIMED','COLLECTED',NULL,'2026-11-20 14:18:36.835650');
INSERT INTO "status_events" VALUES('bc8c7b6502d94afeaf0effac0df890f2','1ff5a035f9844d2e8df0c42a0279732a',NULL,'COLLECTED','DELIVERED',NULL,'2026-11-20 14:41:36.835650');
INSERT INTO "status_events" VALUES('b1b48900473b44a6a048b7b513717767','a55f092cb918462ba6461fea6102f7bb',NULL,NULL,'POSTED',NULL,'2026-11-22 13:47:36.847668');
INSERT INTO "status_events" VALUES('9755172d616746189420f41983df2441','b050dcf687a04fd3af19603e6b67c623',NULL,NULL,'POSTED',NULL,'2026-11-22 13:47:36.847668');
INSERT INTO "status_events" VALUES('da5182251e4d4db18c623e2f457f2911','2cdc276eb9224dab9a741233374a59e2',NULL,NULL,'POSTED',NULL,'2026-11-22 13:47:36.847668');
INSERT INTO "status_events" VALUES('f911fa0e4bb542318b0c0256754ae855','f940f626151c4d1da3da3067ef32c324',NULL,NULL,'POSTED',NULL,'2026-11-22 13:47:36.847668');
INSERT INTO "status_events" VALUES('3bcf5308d12c4fc09158b81aa9b515a8','f940f626151c4d1da3da3067ef32c324',NULL,'POSTED','CLAIMED',NULL,'2026-11-22 13:47:36.847669');
INSERT INTO "status_events" VALUES('c1ae4742e98640399fd3de2ef7fda9e7','2cdc276eb9224dab9a741233374a59e2',NULL,'POSTED','MATCHING','matching_started','2026-11-22 13:49:27.893214');
INSERT INTO "status_events" VALUES('5f354acd4849482ba7d37088a86e6352','2cdc276eb9224dab9a741233374a59e2',NULL,'MATCHING','MATCHING','no_feasible_candidates','2026-11-22 13:49:27.895873');
INSERT INTO "status_events" VALUES('6a997509de71407cabc344409ebed77c','80b1d375280c4eee9142635bc12a5e95',NULL,'MATCHING','EXPIRED','pickup_window_ended','2026-11-22 13:49:27.903524');
INSERT INTO "status_events" VALUES('558fb60e5be54263916783de05f7e6f7','a0c004756f244f9a8a64332d51962f7b',NULL,'OFFERED','EXPIRED','pickup_window_ended','2026-11-22 13:49:27.908339');
INSERT INTO "status_events" VALUES('3e656144dfa64578979b63e6649e4627','a55f092cb918462ba6461fea6102f7bb',NULL,'POSTED','MATCHING','matching_started','2026-11-22 13:49:27.925270');
INSERT INTO "status_events" VALUES('f60881ef5404475a9f5e9e4213057917','a55f092cb918462ba6461fea6102f7bb',NULL,'MATCHING','OFFERED','offer_sent','2026-11-22 13:49:27.929211');
INSERT INTO "status_events" VALUES('ebb29c4f32af40f8b9aa967b90e409d6','a79b62eab9bb4df3b30f808a6b57069e',NULL,'OFFERED','EXPIRED','pickup_window_ended','2026-11-22 13:49:27.932921');
INSERT INTO "status_events" VALUES('d95af40c434b48d7a96b438c3c457075','acd9397963294c2d9932bc9fb15208ed',NULL,'CLAIMED','EXPIRED','pickup_window_ended','2026-11-22 13:49:27.935535');
INSERT INTO "status_events" VALUES('85bef14a2db246809fd155b697687176','b050dcf687a04fd3af19603e6b67c623',NULL,'POSTED','MATCHING','matching_started','2026-11-22 13:49:27.949464');
INSERT INTO "status_events" VALUES('fe39b197d3fe44ebab8fd1d8feb03268','b050dcf687a04fd3af19603e6b67c623',NULL,'MATCHING','OFFERED','offer_sent','2026-11-22 13:49:27.953267');
INSERT INTO "status_events" VALUES('199363994a654155ac21f48843c5b72b','b0ca2b6f18b648c2bd4f9c422e5fcd17',NULL,'MATCHING','EXPIRED','pickup_window_ended','2026-11-22 13:49:27.954299');
INSERT INTO "status_events" VALUES('c603a4b2156342eeb673dcadda341d3d','d4074ba1840641cd9eba63433361191d',NULL,'MATCHING','EXPIRED','pickup_window_ended','2026-11-22 13:49:27.957729');
CREATE TABLE users (
	id CHAR(32) NOT NULL, 
	organization_id CHAR(32) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(16) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at DATETIME NOT NULL, 
	CONSTRAINT pk_users PRIMARY KEY (id), 
	CONSTRAINT ck_users_role_allowed CHECK (role IN ('DONOR', 'RECEIVER', 'ADMIN')), 
	CONSTRAINT fk_users_organization_id_organizations FOREIGN KEY(organization_id) REFERENCES organizations (id) ON DELETE CASCADE
);
INSERT INTO "users" VALUES('ff2333fcd59c429dbdc22232221b78cf','673c50c006ae477cbf99ec6ab6b6e181','Arjun Reddy','donor@rescuerelay.demo','$2b$12$NMHET3OqkBXeQQV/CSWbQO6wSgfw/Z0C4sp25I5ioRI7/hneUlJFi','DONOR',1,'2026-11-21 19:39:19.455568');
INSERT INTO "users" VALUES('331b096f76204366b7c76c0711e95066','36fdcae7731549b0886f2c14ebb9a0c3','Kavya Sharma','hope@rescuerelay.demo','$2b$12$NMHET3OqkBXeQQV/CSWbQO6wSgfw/Z0C4sp25I5ioRI7/hneUlJFi','RECEIVER',1,'2026-11-21 19:39:19.455568');
INSERT INTO "users" VALUES('54b7835b8f354ad49a61ac99b80d7b5f','08e1b365dfad466eb1144fa87d2e5f1d','Anjali Rao','shelter@rescuerelay.demo','$2b$12$NMHET3OqkBXeQQV/CSWbQO6wSgfw/Z0C4sp25I5ioRI7/hneUlJFi','RECEIVER',1,'2026-11-21 19:39:19.455568');
INSERT INTO "users" VALUES('235c5679a2ce40458ad9616f9ffa0116','a4146f8b68484ee8a23f2b0620e0a01a','Nikhil Varma','cityfood@rescuerelay.demo','$2b$12$NMHET3OqkBXeQQV/CSWbQO6wSgfw/Z0C4sp25I5ioRI7/hneUlJFi','RECEIVER',1,'2026-11-21 19:39:19.455568');
INSERT INTO "users" VALUES('0cdb41e50c994f49b6e5acfcb2c678f0','0459660527b24d9aad08f7d7a3ab1edc','Aditi Mehta','admin@rescuerelay.demo','$2b$12$NMHET3OqkBXeQQV/CSWbQO6wSgfw/Z0C4sp25I5ioRI7/hneUlJFi','ADMIN',1,'2026-11-21 19:39:19.455568');
INSERT INTO "users" VALUES('e58014c14964440eabe80efbfb9cf8cf','3e7866beb6b6408296a7b8f3fd9cc991','Priya Reddy','jubilee@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','DONOR',1,'2026-11-22 11:40:49.451704');
INSERT INTO "users" VALUES('0e4531c0dde04961b83248705519bedc','8acd0894fc764d96a50f112d1e5da6b0','Suresh Kumar','hitech@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','DONOR',1,'2026-11-22 11:40:49.453949');
INSERT INTO "users" VALUES('9ea2320d60f44fe890f670944cc8379a','e3b473430dc54f7dab07cafbf5d125a8','Ravi Sharma','banjara@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','DONOR',1,'2026-11-22 11:40:49.455956');
INSERT INTO "users" VALUES('b31cc1afb74d463e9697dce9c62ecc84','371484f32906439cb0277a8738663b60','Anita Patel','kondapur@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','DONOR',1,'2026-11-22 11:40:49.455956');
INSERT INTO "users" VALUES('0828d25b5b3c4e5a87d80b44a6dc8eaf','e4fbc4a588454cdd83711151fb9459c0','Meena Krishnan','sunrise@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','RECEIVER',1,'2026-11-22 11:40:49.455956');
INSERT INTO "users" VALUES('d30a9ea1e0b64f278a9c787b6bae0846','28635142d2844fedb3f47adfce28d119','Ramesh Nair','helping@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','RECEIVER',1,'2026-11-22 11:40:49.461982');
INSERT INTO "users" VALUES('603977c2cf6d4190a7d1574cca1eac4e','54c2130198874229a973ad62c6a35a1a','Deepa Rao','green@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','RECEIVER',1,'2026-11-22 11:40:49.461982');
INSERT INTO "users" VALUES('38236d5996f7445e9cfe99d65999c48a','82664df4c38a4992a43a3a3f2c2e1510','Fatima Begum','asha@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','RECEIVER',1,'2026-11-22 11:40:49.464081');
INSERT INTO "users" VALUES('586621ca36d04e1583aa39309e1fdcd1','68d758aaea3c4df79b44c900ac9b9d8e','Vinod Mehta','roti@rescuerelay.demo','$2b$12$MjqHp2.Vx/DVXdTVgnHH0.R7JNzv982l.VnXHpGOrEfHEvogmV.M.','RECEIVER',1,'2026-11-22 11:40:49.464081');
CREATE INDEX ix_rescues_donor_organization_id ON rescues (donor_organization_id);
CREATE INDEX ix_rescues_status ON rescues (status);
CREATE UNIQUE INDEX ix_rescues_display_id ON rescues (display_id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_organization_id ON users (organization_id);
CREATE INDEX ix_chat_messages_rescue_id ON chat_messages (rescue_id);
CREATE INDEX ix_impact_records_receiver_organization_id ON impact_records (receiver_organization_id);
CREATE INDEX ix_impact_records_donor_organization_id ON impact_records (donor_organization_id);
CREATE INDEX ix_match_offers_receiver_status ON match_offers (receiver_organization_id, status);
CREATE INDEX ix_match_offers_rescue_id ON match_offers (rescue_id);
CREATE UNIQUE INDEX uq_one_accepted_offer_per_rescue ON match_offers (rescue_id) WHERE status = 'ACCEPTED';
CREATE INDEX ix_food_items_rescue_id ON food_items (rescue_id);
CREATE INDEX ix_status_events_rescue_id ON status_events (rescue_id);
CREATE INDEX ix_status_events_created_at ON status_events (created_at);
CREATE INDEX ix_partner_messages_sender_org_id ON partner_messages (sender_org_id);
CREATE INDEX ix_partner_messages_recipient_org_id ON partner_messages (recipient_org_id);
CREATE INDEX ix_partner_ratings_target_org_id ON partner_ratings (target_org_id);
CREATE INDEX ix_donation_recognitions_receiver_organization_id ON donation_recognitions (receiver_organization_id);
CREATE INDEX ix_allocation_notices_rescue_id ON allocation_notices (rescue_id);
COMMIT;
