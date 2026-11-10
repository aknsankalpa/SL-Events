-- Full Unicode (Sinhala, Tamil, Korean, emoji) for every table created below.
ALTER DATABASE CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_user_id` bigint unsigned,
	`actor_label` varchar(120) NOT NULL,
	`action` varchar(80) NOT NULL,
	`target_type` varchar(40) NOT NULL,
	`target_id` varchar(64),
	`detail` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`purpose` enum('verify_email','reset_password') NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`attempts` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auth_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_lines` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`booking_id` bigint unsigned NOT NULL,
	`ticket_type_id` bigint unsigned,
	`section_id` bigint unsigned,
	`name` varchar(80) NOT NULL,
	`qty` int unsigned NOT NULL,
	`unit_price` int unsigned NOT NULL,
	CONSTRAINT `booking_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ref` varchar(16) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`event_id` bigint unsigned,
	`event_title` varchar(160) NOT NULL,
	`event_date_label` varchar(40) NOT NULL,
	`status` enum('awaiting_payment','under_review','proof_rejected','confirmed','attended','expired','cancelled') NOT NULL,
	`fee` int unsigned NOT NULL DEFAULT 0,
	`total` int unsigned NOT NULL,
	`payment_method` enum('bank_transfer','none') NOT NULL,
	`pay_by` datetime,
	`status_note` text,
	`rejection_note` text,
	`verified_at` datetime,
	`verified_by` bigint unsigned,
	`cancelled_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_ref_unique` UNIQUE(`ref`)
);
--> statement-breakpoint
CREATE TABLE `event_staff` (
	`event_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`gate` varchar(60),
	`access_from` datetime,
	`access_until` datetime,
	CONSTRAINT `event_staff_event_id_user_id_pk` PRIMARY KEY(`event_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`organizer_id` bigint unsigned NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('concert','party','cricket','culture','movies','food','travel','community') NOT NULL,
	`status` enum('draft','in_review','changes_requested','on_sale','paused','unpublished','cancelled','ended') NOT NULL DEFAULT 'draft',
	`sell_mode` enum('tickets','seats') NOT NULL DEFAULT 'tickets',
	`starts_at` datetime,
	`doors_open_at` datetime,
	`venue` varchar(160),
	`city` varchar(60),
	`area` varchar(160),
	`tagline` varchar(200),
	`description_html` text,
	`cover_url` varchar(255),
	`featured` boolean NOT NULL DEFAULT false,
	`contact` json,
	`operations` json,
	`status_note` text,
	`submitted_at` datetime,
	`published_at` datetime,
	`cancelled_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`),
	CONSTRAINT `events_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `organizer_applications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ref` varchar(16) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(191) NOT NULL,
	`contact` varchar(120),
	`organization` varchar(160) NOT NULL,
	`kind` varchar(60) NOT NULL,
	`about` text NOT NULL,
	`link` varchar(255),
	`documents` json,
	`status` enum('received','in_review','more_info','approved','declined') NOT NULL DEFAULT 'received',
	`note` text,
	`decided_by` bigint unsigned,
	`decided_at` datetime,
	`organizer_id` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `organizer_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizer_applications_ref_unique` UNIQUE(`ref`)
);
--> statement-breakpoint
CREATE TABLE `organizer_members` (
	`organizer_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`role` enum('owner','manager','door_staff') NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `organizer_members_organizer_id_user_id_pk` PRIMARY KEY(`organizer_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `organizers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(160) NOT NULL,
	`about` text,
	`email` varchar(191),
	`phone` varchar(40),
	`link` varchar(255),
	`logo_url` varchar(255),
	`payout` json,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `organizers_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `payment_proofs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`booking_id` bigint unsigned NOT NULL,
	`file_path` varchar(255) NOT NULL,
	`file_name` varchar(160) NOT NULL,
	`size_bytes` int unsigned NOT NULL,
	`sender` varchar(120),
	`bank` varchar(80),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `payment_proofs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`event_id` bigint unsigned NOT NULL,
	`ticket_id` bigint unsigned,
	`code` varchar(40) NOT NULL,
	`outcome` enum('admitted','already_used','not_found','wrong_event','not_paid','cancelled','too_early','too_late') NOT NULL,
	`staff_user_id` bigint unsigned,
	`gate` varchar(60),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `scan_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seat_charts` (
	`event_id` bigint unsigned NOT NULL,
	`width` int unsigned NOT NULL,
	`height` int unsigned NOT NULL,
	`image_url` varchar(255),
	`stage` json,
	`settings` json,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `seat_charts_event_id` PRIMARY KEY(`event_id`)
);
--> statement-breakpoint
CREATE TABLE `seat_holds` (
	`event_id` bigint unsigned NOT NULL,
	`seat_id` bigint unsigned NOT NULL,
	`booking_id` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `seat_holds_event_id_seat_id_pk` PRIMARY KEY(`event_id`,`seat_id`)
);
--> statement-breakpoint
CREATE TABLE `seat_sections` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`event_id` bigint unsigned NOT NULL,
	`key` varchar(60) NOT NULL,
	`name` varchar(80) NOT NULL,
	`color` varchar(9) NOT NULL,
	`price` int unsigned NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	CONSTRAINT `seat_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `seat_sections_event_key_unique` UNIQUE(`event_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `seats` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`event_id` bigint unsigned NOT NULL,
	`key` varchar(64) NOT NULL,
	`section_id` bigint unsigned,
	`row` varchar(4) NOT NULL,
	`num` int unsigned NOT NULL,
	`label` varchar(12) NOT NULL,
	`x` double NOT NULL,
	`y` double NOT NULL,
	`r` double NOT NULL,
	`accessible` boolean NOT NULL DEFAULT false,
	`blocked` boolean NOT NULL DEFAULT false,
	`locked` boolean NOT NULL DEFAULT false,
	CONSTRAINT `seats_id` PRIMARY KEY(`id`),
	CONSTRAINT `seats_event_key_unique` UNIQUE(`event_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`expires_at` datetime NOT NULL,
	`active_role` enum('customer','organizer','staff','admin'),
	`user_agent` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` varchar(80) NOT NULL,
	`value` json NOT NULL,
	`updated_by` bigint unsigned,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `support_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ref` varchar(16) NOT NULL,
	`user_id` bigint unsigned,
	`name` varchar(120) NOT NULL,
	`email` varchar(191) NOT NULL,
	`topic` varchar(80) NOT NULL,
	`booking_ref` varchar(16),
	`message` text NOT NULL,
	`status` enum('open','answered','closed') NOT NULL DEFAULT 'open',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `support_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_requests_ref_unique` UNIQUE(`ref`)
);
--> statement-breakpoint
CREATE TABLE `ticket_types` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`event_id` bigint unsigned NOT NULL,
	`key` varchar(60) NOT NULL,
	`name` varchar(80) NOT NULL,
	`price` int unsigned NOT NULL,
	`capacity` int unsigned NOT NULL,
	`sold_elsewhere` int unsigned NOT NULL DEFAULT 0,
	`max_per_order` int unsigned NOT NULL DEFAULT 10,
	`summary` varchar(200),
	`perks` json,
	`color` varchar(9),
	`visible` boolean NOT NULL DEFAULT true,
	`sales_paused` boolean NOT NULL DEFAULT false,
	`sales_end_at` datetime,
	`sort` int NOT NULL DEFAULT 0,
	CONSTRAINT `ticket_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `ticket_types_event_key_unique` UNIQUE(`event_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`booking_id` bigint unsigned NOT NULL,
	`event_id` bigint unsigned,
	`code` varchar(20) NOT NULL,
	`holder_name` varchar(120) NOT NULL,
	`ticket_name` varchar(80) NOT NULL,
	`seat_id` bigint unsigned,
	`seat_label` varchar(12),
	`position` int unsigned NOT NULL,
	`scanned_at` datetime,
	`scanned_by` bigint unsigned,
	`gate` varchar(60),
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` bigint unsigned NOT NULL,
	`role` enum('customer','organizer','staff','admin') NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_roles_user_id_role_pk` PRIMARY KEY(`user_id`,`role`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255),
	`email_verified_at` datetime,
	`phone` varchar(40),
	`city` varchar(60),
	`settings` json,
	`disabled_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_lines` ADD CONSTRAINT `booking_lines_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_lines` ADD CONSTRAINT `booking_lines_ticket_type_id_ticket_types_id_fk` FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_lines` ADD CONSTRAINT `booking_lines_section_id_seat_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `seat_sections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_staff` ADD CONSTRAINT `event_staff_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_staff` ADD CONSTRAINT `event_staff_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_organizer_id_organizers_id_fk` FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizer_applications` ADD CONSTRAINT `organizer_applications_decided_by_users_id_fk` FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizer_applications` ADD CONSTRAINT `organizer_applications_organizer_id_organizers_id_fk` FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizer_members` ADD CONSTRAINT `organizer_members_organizer_id_organizers_id_fk` FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizer_members` ADD CONSTRAINT `organizer_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scan_log` ADD CONSTRAINT `scan_log_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scan_log` ADD CONSTRAINT `scan_log_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scan_log` ADD CONSTRAINT `scan_log_staff_user_id_users_id_fk` FOREIGN KEY (`staff_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seat_charts` ADD CONSTRAINT `seat_charts_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seat_holds` ADD CONSTRAINT `seat_holds_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seat_holds` ADD CONSTRAINT `seat_holds_seat_id_seats_id_fk` FOREIGN KEY (`seat_id`) REFERENCES `seats`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seat_holds` ADD CONSTRAINT `seat_holds_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seat_sections` ADD CONSTRAINT `seat_sections_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seats` ADD CONSTRAINT `seats_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seats` ADD CONSTRAINT `seats_section_id_seat_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `seat_sections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_requests` ADD CONSTRAINT `support_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_types` ADD CONSTRAINT `ticket_types_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_seat_id_seats_id_fk` FOREIGN KEY (`seat_id`) REFERENCES `seats`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_scanned_by_users_id_fk` FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_log_at_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_target_idx` ON `audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `auth_codes_email_idx` ON `auth_codes` (`email`,`purpose`);--> statement-breakpoint
CREATE INDEX `booking_lines_booking_idx` ON `booking_lines` (`booking_id`);--> statement-breakpoint
CREATE INDEX `bookings_user_idx` ON `bookings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `bookings_event_status_idx` ON `bookings` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `bookings_pay_by_idx` ON `bookings` (`status`,`pay_by`);--> statement-breakpoint
CREATE INDEX `events_organizer_idx` ON `events` (`organizer_id`);--> statement-breakpoint
CREATE INDEX `events_status_starts_idx` ON `events` (`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `organizer_applications_email_idx` ON `organizer_applications` (`email`);--> statement-breakpoint
CREATE INDEX `payment_proofs_booking_idx` ON `payment_proofs` (`booking_id`);--> statement-breakpoint
CREATE INDEX `scan_log_event_idx` ON `scan_log` (`event_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `seat_holds_booking_idx` ON `seat_holds` (`booking_id`);--> statement-breakpoint
CREATE INDEX `seats_section_idx` ON `seats` (`section_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `tickets_booking_idx` ON `tickets` (`booking_id`);--> statement-breakpoint
CREATE INDEX `tickets_event_idx` ON `tickets` (`event_id`);