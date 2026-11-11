ALTER TABLE `event_staff` ADD `role` enum('gate_lead','scanner','support') DEFAULT 'scanner' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_staff` ADD `suspended` boolean DEFAULT false NOT NULL;