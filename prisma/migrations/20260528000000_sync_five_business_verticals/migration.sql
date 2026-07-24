INSERT OR IGNORE INTO "business_verticals" ("key", "name", "description") VALUES
('accommodation_hotel', 'Accommodation / Hotel', 'Rooms, reservations, check-in, guest services, and amenities inventory');

INSERT OR IGNORE INTO "platform_modules" ("key", "name", "group", "is_core") VALUES
('accommodation.reservations', 'Reservations', 'accommodation', false),
('accommodation.rooms', 'Rooms', 'accommodation', false),
('accommodation.checkin', 'Check-in / Check-out', 'accommodation', false),
('accommodation.housekeeping', 'Housekeeping', 'accommodation', false),
('accommodation.guest_services', 'Guest Services', 'accommodation', false),
('accommodation.amenities_inventory', 'Amenities Inventory', 'accommodation', false);

INSERT OR IGNORE INTO "business_vertical_modules" ("vertical_key", "module_key") VALUES
('accommodation_hotel', 'accommodation.reservations'),
('accommodation_hotel', 'accommodation.rooms'),
('accommodation_hotel', 'accommodation.checkin'),
('accommodation_hotel', 'accommodation.housekeeping'),
('accommodation_hotel', 'accommodation.guest_services'),
('accommodation_hotel', 'accommodation.amenities_inventory');

UPDATE "store_settings"
SET "value" = 'retail'
WHERE "key" LIKE '%businessVertical' AND "value" = 'retail_store';

UPDATE "store_settings"
SET "value" = 'construction_materials'
WHERE "key" LIKE '%businessVertical' AND "value" = 'building_materials';

UPDATE "store_settings"
SET "value" = 'accommodation_hotel'
WHERE "key" LIKE '%businessVertical' AND "value" = 'accommodation';

UPDATE "store_business_profiles"
SET "verified_business_vertical" = 'retail'
WHERE "verified_business_vertical" = 'retail_store';

UPDATE "store_business_profiles"
SET "requested_business_vertical" = 'retail'
WHERE "requested_business_vertical" = 'retail_store';

UPDATE "store_business_profiles"
SET "verified_business_vertical" = 'construction_materials'
WHERE "verified_business_vertical" = 'building_materials';

UPDATE "store_business_profiles"
SET "requested_business_vertical" = 'construction_materials'
WHERE "requested_business_vertical" = 'building_materials';

UPDATE "store_business_profiles"
SET "verified_business_vertical" = 'accommodation_hotel'
WHERE "verified_business_vertical" = 'accommodation';

UPDATE "store_business_profiles"
SET "requested_business_vertical" = 'accommodation_hotel'
WHERE "requested_business_vertical" = 'accommodation';

UPDATE "store_business_profiles"
SET "verification_status" = 'verified'
WHERE "verification_status" = 'auto_approved';
