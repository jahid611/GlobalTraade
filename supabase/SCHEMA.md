# Schéma consolidé — Globly (Supabase `uspqseorjkaqxcmliamg`)

> Snapshot généré depuis la base live le 2026-07-24. Source de vérité unique
> remplaçant la lecture des ~50 patchs SQL historiques. À régénérer après
> toute migration.

## Tables

### `connections`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| requester_id | uuid | non |  |
| recipient_id | uuid | non |  |
| status | text | non | 'pending'::text |
| created_at | timestamp with time zone | non | timezone('utc'::text, now()) |
| updated_at | timestamp with time zone | non | timezone('utc'::text, now()) |

**Contraintes :**
- `connections_pkey` : PRIMARY KEY (id)
- `connections_recipient_id_fkey` : FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE
- `connections_requester_id_fkey` : FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE
- `connections_status_check` : CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text])))
- `connections_unique_users` : UNIQUE (requester_id, recipient_id)

**Policies RLS :**
- [DELETE] `Supprimer relation` — USING: ((auth.uid() = requester_id) OR (auth.uid() = recipient_id))
- [DELETE] `Users can delete their connections` — USING: ((auth.uid() = requester_id) OR (auth.uid() = recipient_id))
- [INSERT] `Ajouter relation` — USING: — — WITH CHECK: (auth.uid() = requester_id)
- [INSERT] `Users can create connections` — USING: — — WITH CHECK: (auth.uid() = requester_id)
- [SELECT] `Accepted connections are public` — USING: (status = 'accepted'::text)
- [SELECT] `Voir ses relations` — USING: ((auth.uid() = requester_id) OR (auth.uid() = recipient_id))
- [SELECT] `users_can_see_their_connections_received` — USING: ((auth.uid() = requester_id) OR (auth.uid() = recipient_id))
- [UPDATE] `Mise à jour (Accepter)` — USING: ((auth.uid() = requester_id) OR (auth.uid() = recipient_id))
- [UPDATE] `Users can update their received connections` — USING: ((auth.uid() = recipient_id) OR (auth.uid() = requester_id))

### `conversation_initiations`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| initiator_id | uuid | non |  |
| other_user_id | uuid | non |  |
| listing_id | uuid | oui |  |
| year_month | text | non |  |
| created_at | timestamp with time zone | non | now() |

**Contraintes :**
- `conversation_initiations_initiator_id_fkey` : FOREIGN KEY (initiator_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `conversation_initiations_other_user_id_fkey` : FOREIGN KEY (other_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `conversation_initiations_pkey` : PRIMARY KEY (id)

**Policies RLS :**
- [ALL] `Users manage their own initiations` — USING: (initiator_id = auth.uid()) — WITH CHECK: (initiator_id = auth.uid())

### `dismissed_notifications`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| user_id | uuid | non |  |
| notification_key | text | non |  |
| dismissed_at | timestamp with time zone | oui | timezone('utc'::text, now()) |

**Contraintes :**
- `dismissed_notifications_pkey` : PRIMARY KEY (id)
- `dismissed_notifications_unique` : UNIQUE (user_id, notification_key)
- `dismissed_notifications_user_id_fkey` : FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

**Policies RLS :**
- [ALL] `Users can manage their dismissed notifications` — USING: (auth.uid() = user_id) — WITH CHECK: (auth.uid() = user_id)

### `due_diligence_tasks`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| listing_id | uuid | oui |  |
| deal_id | text | oui |  |
| buyer_id | uuid | non |  |
| seller_id | uuid | non |  |
| title | text | non |  |
| category | text | non |  |
| description | text | oui |  |
| status | text | non | 'pending'::text |
| priority | text | non | 'medium'::text |
| assigned_to | uuid | oui |  |
| due_date | timestamp with time zone | oui |  |
| completed_at | timestamp with time zone | oui |  |
| notes | text | oui |  |
| created_at | timestamp with time zone | non | timezone('utc'::text, now()) |
| updated_at | timestamp with time zone | non | timezone('utc'::text, now()) |
| project_id | uuid | oui |  |

**Contraintes :**
- `due_diligence_tasks_assigned_to_fkey` : FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
- `due_diligence_tasks_buyer_id_fkey` : FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `due_diligence_tasks_category_check` : CHECK ((category = ANY (ARRAY['governance'::text, 'financial'::text, 'legal'::text, 'social'::text, 'operational'::text, 'tax'::text, 'environmental'::text])))
- `due_diligence_tasks_listing_id_fkey` : FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
- `due_diligence_tasks_pkey` : PRIMARY KEY (id)
- `due_diligence_tasks_priority_check` : CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
- `due_diligence_tasks_project_id_fkey` : FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `due_diligence_tasks_seller_id_fkey` : FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `due_diligence_tasks_status_check` : CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'blocked'::text])))

**Policies RLS :**
- [DELETE] `Deal parties can delete tasks` — USING: ((auth.uid() = buyer_id) OR (auth.uid() = seller_id))
- [INSERT] `Deal parties can create tasks` — USING: — — WITH CHECK: ((auth.uid() = buyer_id) OR (auth.uid() = seller_id))
- [SELECT] `Deal parties can view their tasks` — USING: ((auth.uid() = buyer_id) OR (auth.uid() = seller_id))
- [UPDATE] `Deal parties can update tasks` — USING: ((auth.uid() = buyer_id) OR (auth.uid() = seller_id))

### `favorites`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| user_id | uuid | oui |  |
| listing_id | uuid | oui |  |
| created_at | timestamp with time zone | oui | now() |

**Contraintes :**
- `favorites_listing_id_fkey` : FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
- `favorites_pkey` : PRIMARY KEY (id)
- `favorites_user_id_fkey` : FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `favorites_user_id_listing_id_key` : UNIQUE (user_id, listing_id)
- `favorites_user_listing_unique` : UNIQUE (user_id, listing_id)

**Policies RLS :**
- [ALL] `Users can manage their own favorites` — USING: (auth.uid() = user_id)
- [DELETE] `Favorites Delete Policy` — USING: (auth.uid() = user_id)
- [DELETE] `Suppression de favoris` — USING: (auth.uid() = user_id)
- [INSERT] `Ajout de favoris` — USING: — — WITH CHECK: (auth.uid() = user_id)
- [INSERT] `Favorites Insert Policy` — USING: — — WITH CHECK: (auth.uid() = user_id)
- [SELECT] `Favorites Select Policy` — USING: ((auth.uid() = user_id) OR (auth.uid() IN ( SELECT listings.owner_id    FROM listings   WHERE (listings.id = favorites.listing_id))))
- [SELECT] `Lecture de ses favoris` — USING: (auth.uid() = user_id)
- [SELECT] `Les propriétaires peuvent voir les favoris de leurs annonces` — USING: (EXISTS ( SELECT 1    FROM listings   WHERE ((listings.id = favorites.listing_id) AND (listings.owner_id = auth.uid()))))
- [SELECT] `Listing owners can view favorites on their listings` — USING: (EXISTS ( SELECT 1    FROM listings l   WHERE ((l.id = favorites.listing_id) AND (l.owner_id = auth.uid()))))

### `listing_unlocks`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| user_id | uuid | non |  |
| target_type | text | non |  |
| target_id | uuid | non |  |
| amount_cents | integer | non | 500 |
| created_at | timestamp with time zone | non | now() |

**Contraintes :**
- `listing_unlocks_pkey` : PRIMARY KEY (id)
- `listing_unlocks_target_type_check` : CHECK ((target_type = ANY (ARRAY['listing'::text, 'project'::text, 'search_ad'::text])))
- `listing_unlocks_user_id_fkey` : FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `listing_unlocks_user_id_target_type_target_id_key` : UNIQUE (user_id, target_type, target_id)

**Policies RLS :**
- [ALL] `Users manage their unlocks` — USING: (user_id = auth.uid()) — WITH CHECK: (user_id = auth.uid())
- [SELECT] `Owners see unlocks on their listings` — USING: (((target_type = 'listing'::text) AND (EXISTS ( SELECT 1    FROM listings l   WHERE ((l.id = listing_unlocks.target_id) AND (l.owner_id = auth.uid()))))) OR ((target_type = 'project'::text) AND (EXISTS ( SELECT 1    FROM projects p   WHERE ((p.id = listing_unlocks.target_id) AND (p.owner_id = auth.uid()))))) OR ((target_type = 'search_ad'::text) AND (EXISTS ( SELECT 1    FROM search_ads s   WHERE ((s.id = listing_unlocks.target_id) AND (s.owner_id = auth.uid()))))))

### `listing_views`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| listing_id | uuid | oui |  |
| viewer_id | uuid | oui |  |
| created_at | timestamp with time zone | oui | now() |

**Contraintes :**
- `listing_views_listing_id_fkey` : FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
- `listing_views_pkey` : PRIMARY KEY (id)
- `listing_views_viewer_id_fkey` : FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE SET NULL
- `unique_listing_viewer` : UNIQUE (listing_id, viewer_id)

**Policies RLS :**
- [INSERT] `Anyone can record a view` — USING: — — WITH CHECK: true
- [SELECT] `Admins read all listing views` — USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND (p.is_admin = true))))
- [SELECT] `Owners can see views of their listings` — USING: (EXISTS ( SELECT 1    FROM listings   WHERE ((listings.id = listing_views.listing_id) AND (listings.owner_id = auth.uid()))))

### `listings`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| name | text | non |  |
| siret | text | oui |  |
| industry | text | oui |  |
| address | text | oui |  |
| lat | double precision | oui |  |
| lng | double precision | oui |  |
| location | USER-DEFINED | oui |  |
| price | numeric | oui |  |
| revenue_n1 | numeric | oui |  |
| ebitda | numeric | oui |  |
| rent | numeric | oui |  |
| employees | integer | oui |  |
| surface | numeric | oui |  |
| lease_details | text | oui |  |
| created_at | timestamp with time zone | oui | now() |
| owner_id | uuid | oui |  |
| logo_url | text | oui |  |
| website_url | text | oui |  |
| hide_siret | boolean | oui | false |
| image_urls | ARRAY | oui | '{}'::text[] |
| description | text | oui |  |
| reason_for_selling | text | oui |  |
| established_year | integer | oui |  |
| revenue_n2 | numeric | oui |  |
| revenue_n3 | numeric | oui |  |
| requires_nda | boolean | oui | true |
| management_type | text | oui |  |
| client_concentration | text | oui |  |
| digital_maturity | text | oui |  |
| market_trend | text | oui |  |
| is_premium | boolean | non | false |
| updated_at | timestamp with time zone | non | now() |
| status | text | non | 'active'::text |
| last_confirmed_at | timestamp with time zone | non | now() |
| renewal_requested_at | timestamp with time zone | oui |  |
| inactive_since | timestamp with time zone | oui |  |
| renewal_reminder_sent_at | timestamp with time zone | oui |  |
| boosted_until | timestamp with time zone | oui |  |
| share_financials | boolean | non | true |

**Contraintes :**
- `listings_owner_id_fkey` : FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `listings_pkey` : PRIMARY KEY (id)
- `listings_status_check` : CHECK ((status = ANY (ARRAY['active'::text, 'pending_renewal'::text, 'inactive'::text])))

**Policies RLS :**
- [DELETE] `Suppression par le propriétaire` — USING: (auth.uid() = owner_id)
- [DELETE] `Users can delete own listings` — USING: (auth.uid() = owner_id)
- [INSERT] `Création autorisée aux connectés` — USING: — — WITH CHECK: (auth.uid() = owner_id)
- [INSERT] `Users can insert own listings` — USING: — — WITH CHECK: (auth.uid() = owner_id)
- [SELECT] `Listings publics` — USING: true
- [SELECT] `Public read access` — USING: true
- [UPDATE] `Modification par le propriétaire` — USING: (auth.uid() = owner_id)
- [UPDATE] `Users can update own listings` — USING: (auth.uid() = owner_id)

### `messages`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| listing_id | uuid | oui |  |
| sender_id | uuid | non |  |
| receiver_id | uuid | non |  |
| content | text | non |  |
| created_at | timestamp with time zone | oui | now() |
| project_id | uuid | oui |  |
| type | text | oui |  |
| metadata | jsonb | oui |  |
| is_read | boolean | non | false |

**Contraintes :**
- `messages_listing_id_fkey` : FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
- `messages_pkey` : PRIMARY KEY (id)
- `messages_project_id_fkey` : FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `messages_receiver_id_fkey` : FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `messages_sender_id_fkey` : FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE

**Policies RLS :**
- [DELETE] `Users can delete own messages` — USING: (auth.uid() = sender_id)
- [DELETE] `Users can delete their messages` — USING: ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
- [INSERT] `Envoi de messages` — USING: — — WITH CHECK: (auth.uid() = sender_id)
- [INSERT] `Users can insert their own messages` — USING: — — WITH CHECK: (auth.uid() = sender_id)
- [SELECT] `Lecture de ses propres messages` — USING: ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
- [SELECT] `Users can read their own messages` — USING: ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
- [UPDATE] `Marquer un message comme lu` — USING: ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
- [UPDATE] `Users can update own messages` — USING: (auth.uid() = sender_id)

### `ndas`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| listing_id | uuid | non |  |
| buyer_id | uuid | non |  |
| status | text | oui | 'pending'::text |
| signature_text | text | oui |  |
| signed_at | timestamp with time zone | oui |  |
| created_at | timestamp with time zone | oui | timezone('utc'::text, now()) |

**Contraintes :**
- `ndas_buyer_id_fkey` : FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `ndas_listing_id_buyer_id_key` : UNIQUE (listing_id, buyer_id)
- `ndas_listing_id_fkey` : FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
- `ndas_pkey` : PRIMARY KEY (id)
- `ndas_status_check` : CHECK ((status = ANY (ARRAY['pending'::text, 'signed'::text, 'rejected'::text, 'revoked'::text])))

**Policies RLS :**
- [INSERT] `Buyers can create NDAs` — USING: — — WITH CHECK: (auth.uid() = buyer_id)
- [SELECT] `Buyers can view own NDAs` — USING: (auth.uid() = buyer_id)
- [SELECT] `Owners can view NDAs for their listings` — USING: (auth.uid() IN ( SELECT listings.owner_id    FROM listings   WHERE (listings.id = ndas.listing_id)))
- [UPDATE] `Buyers can sign their NDA` — USING: ((auth.uid() = buyer_id) AND (status = 'pending'::text))
- [UPDATE] `Owners can update NDA status` — USING: (auth.uid() IN ( SELECT listings.owner_id    FROM listings   WHERE (listings.id = ndas.listing_id)))

### `profile_views`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| profile_id | uuid | oui |  |
| viewer_id | uuid | oui |  |
| created_at | timestamp with time zone | oui | now() |

**Contraintes :**
- `profile_views_pkey` : PRIMARY KEY (id)
- `profile_views_profile_id_fkey` : FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
- `profile_views_viewer_id_fkey` : FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE SET NULL
- `unique_profile_viewer` : UNIQUE (profile_id, viewer_id)

**Policies RLS :**
- [INSERT] `Anyone can record profile view` — USING: — — WITH CHECK: true
- [SELECT] `Owners can see views of their profile` — USING: (profile_id = auth.uid())

### `profiles`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non |  |
| full_name | text | oui |  |
| bio | text | oui |  |
| phone | text | oui |  |
| show_email | boolean | oui | false |
| show_phone | boolean | oui | false |
| avatar_url | text | oui |  |
| updated_at | timestamp with time zone | oui | now() |
| contact_email | text | oui |  |
| is_admin | boolean | oui | false |
| kyc_status | text | oui | 'none'::text |
| plan_type | text | oui | 'free'::text |
| target_sectors | text | oui |  |
| target_budget | text | oui |  |
| target_geo | text | oui |  |
| account_type | text | oui |  |
| company_name | text | oui |  |
| siren | text | oui |  |
| legal_form | text | oui |  |
| role_function | text | oui |  |
| country | text | oui | 'France'::text |
| terms_accepted_at | timestamp with time zone | oui |  |
| onboarding_completed | boolean | oui | false |
| ape_code | text | oui |  |
| buyer_type | text | oui |  |
| buyer_level | text | non | 'profil_cree'::text |
| apport | text | oui |  |
| target_revenue | text | oui |  |
| experience | text | oui |  |
| ambitions | text | oui |  |
| stripe_customer_id | text | oui |  |
| stripe_subscription_id | text | oui |  |

**Contraintes :**
- `profiles_buyer_level_check` : CHECK ((buyer_level = ANY (ARRAY['profil_cree'::text, 'qualifie'::text, 'finance_verifie'::text])))
- `profiles_buyer_type_check` : CHECK (((buyer_type IS NULL) OR (buyer_type = ANY (ARRAY['individuel'::text, 'entreprise'::text, 'investisseur'::text]))))
- `profiles_id_fkey` : FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
- `profiles_kyc_status_check` : CHECK ((kyc_status = ANY (ARRAY['none'::text, 'pending'::text, 'verified'::text, 'rejected'::text])))
- `profiles_pkey` : PRIMARY KEY (id)
- `profiles_plan_type_check` : CHECK ((plan_type = ANY (ARRAY['free'::text, 'pro'::text, 'business'::text])))

**Policies RLS :**
- [INSERT] `Users can insert their own profile.` — USING: — — WITH CHECK: (auth.uid() = id)
- [SELECT] `Own profile read` — USING: (auth.uid() = id)
- [UPDATE] `Admins can update any profile` — USING: (EXISTS ( SELECT 1    FROM profiles admin_p   WHERE ((admin_p.id = auth.uid()) AND (admin_p.is_admin = true))))
- [UPDATE] `Modification de son propre profil` — USING: (auth.uid() = id)
- [UPDATE] `Users can update own profile.` — USING: (auth.uid() = id)

**Triggers :**
- CREATE TRIGGER trg_protect_buyer_level BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_buyer_level()

### `project_access_requests`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| project_id | uuid | non |  |
| requester_id | uuid | non |  |
| message | text | oui |  |
| status | text | non | 'pending'::text |
| created_at | timestamp with time zone | non | now() |

**Contraintes :**
- `project_access_requests_pkey` : PRIMARY KEY (id)
- `project_access_requests_project_id_fkey` : FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `project_access_requests_project_id_requester_id_key` : UNIQUE (project_id, requester_id)
- `project_access_requests_requester_id_fkey` : FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `project_access_requests_status_check` : CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))

**Policies RLS :**
- [ALL] `Requesters manage their requests` — USING: (requester_id = auth.uid()) — WITH CHECK: ((requester_id = auth.uid()) AND (status = 'pending'::text))
- [SELECT] `Owners see and answer requests` — USING: (EXISTS ( SELECT 1    FROM projects pr   WHERE ((pr.id = project_access_requests.project_id) AND (pr.owner_id = auth.uid()))))
- [UPDATE] `Owners update requests` — USING: (EXISTS ( SELECT 1    FROM projects pr   WHERE ((pr.id = project_access_requests.project_id) AND (pr.owner_id = auth.uid()))))

### `project_interests`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| project_id | uuid | non |  |
| user_id | uuid | non |  |
| help_type | text | non |  |
| message | text | oui |  |
| status | text | oui | 'pending'::text |
| created_at | timestamp with time zone | oui | now() |

**Contraintes :**
- `project_interests_pkey` : PRIMARY KEY (id)
- `project_interests_project_id_fkey` : FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `project_interests_project_id_user_id_help_type_key` : UNIQUE (project_id, user_id, help_type)
- `project_interests_user_id_fkey` : FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

**Policies RLS :**
- [INSERT] `interests_insert_auth` — USING: — — WITH CHECK: (auth.uid() = user_id)
- [SELECT] `interests_owner_read` — USING: (EXISTS ( SELECT 1    FROM projects pr   WHERE ((pr.id = project_interests.project_id) AND (pr.owner_id = auth.uid()))))
- [SELECT] `interests_self_read` — USING: (user_id = auth.uid())
- [UPDATE] `interests_owner_update` — USING: ((auth.uid() = user_id) OR (auth.uid() = ( SELECT projects.owner_id    FROM projects   WHERE (projects.id = project_interests.project_id))))

### `project_private`

| colonne | type | null | défaut |
|---|---|---|---|
| project_id | uuid | non |  |
| business_plan | jsonb | non | '{}'::jsonb |
| updated_at | timestamp with time zone | non | now() |

**Contraintes :**
- `project_private_pkey` : PRIMARY KEY (project_id)
- `project_private_project_id_fkey` : FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE

**Policies RLS :**
- [ALL] `Owners manage their private file` — USING: (EXISTS ( SELECT 1    FROM projects pr   WHERE ((pr.id = project_private.project_id) AND (pr.owner_id = auth.uid())))) — WITH CHECK: (EXISTS ( SELECT 1    FROM projects pr   WHERE ((pr.id = project_private.project_id) AND (pr.owner_id = auth.uid()))))
- [SELECT] `Accepted requesters read the private file` — USING: (EXISTS ( SELECT 1    FROM project_access_requests req   WHERE ((req.project_id = project_private.project_id) AND (req.requester_id = auth.uid()) AND (req.status = 'accepted'::text))))

### `project_views`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| project_id | uuid | non |  |
| viewer_id | uuid | non |  |
| created_at | timestamp with time zone | oui | now() |

**Contraintes :**
- `project_views_pkey` : PRIMARY KEY (id)
- `project_views_project_id_fkey` : FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
- `project_views_project_id_viewer_id_key` : UNIQUE (project_id, viewer_id)
- `project_views_viewer_id_fkey` : FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE

**Policies RLS :**
- [INSERT] `views_insert_auth` — USING: — — WITH CHECK: (auth.uid() = viewer_id)
- [SELECT] `views_owner_read` — USING: (auth.uid() = ( SELECT projects.owner_id    FROM projects   WHERE (projects.id = project_views.project_id)))

**Triggers :**
- CREATE TRIGGER trg_increment_project_views AFTER INSERT ON public.project_views FOR EACH ROW EXECUTE FUNCTION handle_project_view()

### `projects`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| owner_id | uuid | non |  |
| title | text | non |  |
| tagline | text | oui |  |
| description | text | non |  |
| category | text | non |  |
| stage | text | non | 'idea'::text |
| country | text | oui |  |
| city | text | oui |  |
| website_url | text | oui |  |
| cover_image_url | text | oui |  |
| help_types | ARRAY | oui | '{}'::text[] |
| financial_needed | boolean | oui | false |
| budget_min | numeric | oui |  |
| budget_max | numeric | oui |  |
| budget_currency | text | oui | 'EUR'::text |
| investment_type | text | oui |  |
| equity_offered | numeric | oui |  |
| human_needed | boolean | oui | false |
| team_roles | jsonb | oui | '[]'::jsonb |
| material_needed | boolean | oui | false |
| material_items | jsonb | oui | '[]'::jsonb |
| expertise_needed | boolean | oui | false |
| expertise_domains | ARRAY | oui | '{}'::text[] |
| network_needed | boolean | oui | false |
| view_count | integer | oui | 0 |
| interest_count | integer | oui | 0 |
| is_published | boolean | oui | true |
| is_urgent | boolean | oui | false |
| deadline | date | oui |  |
| created_at | timestamp with time zone | oui | now() |
| updated_at | timestamp with time zone | oui | now() |
| apport_personnel | text | oui |  |
| funds_usage | text | oui |  |
| revenue_current | text | oui |  |
| revenue_forecast | text | oui |  |
| financing_types | ARRAY | non | '{}'::text[] |
| verification_status | text | non | 'non_soumis'::text |
| boosted_until | timestamp with time zone | oui |  |

**Contraintes :**
- `projects_owner_id_fkey` : FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `projects_owner_id_profiles_fkey` : FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
- `projects_pkey` : PRIMARY KEY (id)
- `projects_verification_status_check` : CHECK ((verification_status = ANY (ARRAY['non_soumis'::text, 'en_attente'::text, 'verifie'::text, 'rejete'::text])))

**Policies RLS :**
- [ALL] `projects_owner_all` — USING: (auth.uid() = owner_id)
- [INSERT] `projects_insert_auth` — USING: — — WITH CHECK: (auth.uid() = owner_id)
- [SELECT] `projects_public_read` — USING: (is_published = true)

**Triggers :**
- CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at()
- CREATE TRIGGER trg_protect_project_verification BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION protect_project_verification()

### `prospection_contacts`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| user_id | uuid | non |  |
| siren | text | non |  |
| company_name | text | oui |  |
| year_month | text | non |  |
| billed | boolean | non | false |
| amount_cents | integer | non | 0 |
| created_at | timestamp with time zone | non | now() |

**Contraintes :**
- `prospection_contacts_pkey` : PRIMARY KEY (id)
- `prospection_contacts_user_id_fkey` : FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `prospection_contacts_user_id_siren_year_month_key` : UNIQUE (user_id, siren, year_month)

**Policies RLS :**
- [ALL] `Users manage their prospection contacts` — USING: (user_id = auth.uid()) — WITH CHECK: (user_id = auth.uid())

### `prospects`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| siren | text | non |  |
| nom | text | non |  |
| code_ape | text | oui |  |
| libelle_ape | text | oui |  |
| ville | text | oui |  |
| code_postal | text | oui |  |
| departement | text | oui |  |
| region | text | oui |  |
| date_creation | date | oui |  |
| anciennete | integer | oui |  |
| tranche_effectif | text | oui |  |
| nature_juridique | text | oui |  |
| dirigeant_nom | text | oui |  |
| dirigeant_age | integer | oui |  |
| score | integer | oui | 0 |
| status | text | non | 'a_qualifier'::text |
| email | text | oui |  |
| notes | text | oui |  |
| raw | jsonb | oui |  |
| created_by | uuid | oui | auth.uid() |
| created_at | timestamp with time zone | oui | now() |
| updated_at | timestamp with time zone | oui | now() |
| mail_lang | text | oui |  |

**Contraintes :**
- `prospects_created_by_fkey` : FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
- `prospects_pkey` : PRIMARY KEY (id)
- `prospects_status_check` : CHECK ((status = ANY (ARRAY['a_qualifier'::text, 'email_trouve'::text, 'contacte'::text, 'relance_1'::text, 'relance_2'::text, 'reponse'::text, 'interesse'::text, 'refus'::text])))
- `prospects_user_siren_key` : UNIQUE (created_by, siren)

**Policies RLS :**
- [ALL] `Users manage own prospects` — USING: (created_by = auth.uid()) — WITH CHECK: (created_by = auth.uid())

**Triggers :**
- CREATE TRIGGER trg_set_prospect_owner BEFORE INSERT ON public.prospects FOR EACH ROW EXECUTE FUNCTION set_prospect_owner()

### `ratings`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| rater_id | uuid | non |  |
| rated_id | uuid | non |  |
| score | numeric | non |  |
| comment | text | oui |  |
| justification | text | oui |  |
| status | text | non | 'published'::text |
| created_at | timestamp with time zone | non | now() |

**Contraintes :**
- `ratings_low_score_justified` : CHECK (((score >= 2.5) OR ((justification IS NOT NULL) AND (length(justification) >= 20))))
- `ratings_no_self` : CHECK ((rater_id <> rated_id))
- `ratings_pkey` : PRIMARY KEY (id)
- `ratings_rated_id_fkey` : FOREIGN KEY (rated_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `ratings_rater_id_fkey` : FOREIGN KEY (rater_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `ratings_rater_id_rated_id_key` : UNIQUE (rater_id, rated_id)
- `ratings_score_check` : CHECK (((score >= (1)::numeric) AND (score <= (5)::numeric)))
- `ratings_status_check` : CHECK ((status = ANY (ARRAY['published'::text, 'under_review'::text, 'rejected'::text])))

**Policies RLS :**
- [DELETE] `Admins can delete ratings` — USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND p.is_admin)))
- [DELETE] `Raters can delete their own rating` — USING: (rater_id = auth.uid())
- [INSERT] `Members can rate people they interacted with` — USING: — — WITH CHECK: ((rater_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM messages m   WHERE (((m.sender_id = auth.uid()) AND (m.receiver_id = ratings.rated_id)) OR ((m.sender_id = ratings.rated_id) AND (m.receiver_id = auth.uid()))))))
- [SELECT] `Published ratings are readable` — USING: ((status = 'published'::text) OR (rater_id = auth.uid()) OR (rated_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND p.is_admin))))
- [UPDATE] `Admins can moderate ratings` — USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND p.is_admin)))
- [UPDATE] `Raters can update their own rating` — USING: (rater_id = auth.uid()) — WITH CHECK: (rater_id = auth.uid())

**Triggers :**
- CREATE TRIGGER trg_moderate_low_rating BEFORE INSERT OR UPDATE OF score ON public.ratings FOR EACH ROW EXECUTE FUNCTION moderate_low_rating()

### `reports`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| reporter_id | uuid | non |  |
| listing_id | uuid | non |  |
| content | text | non |  |
| status | text | non | 'pending'::text |
| created_at | timestamp with time zone | oui | now() |

**Contraintes :**
- `reports_listing_id_fkey` : FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
- `reports_pkey` : PRIMARY KEY (id)
- `reports_reporter_id_fkey` : FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `reports_status_check` : CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text, 'dismissed'::text])))

**Policies RLS :**
- [ALL] `Admins manage reports` — USING: (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND (p.is_admin = true))))
- [INSERT] `Users can create reports` — USING: — — WITH CHECK: (auth.uid() = reporter_id)
- [SELECT] `Reporters and admins can read reports` — USING: ((auth.uid() = reporter_id) OR (EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))))

### `search_ads`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| owner_id | uuid | non |  |
| title | text | non |  |
| buyer_type | text | oui |  |
| sectors | text | oui |  |
| regions | text | oui |  |
| revenue_range | text | oui |  |
| budget | text | oui |  |
| apport_available | boolean | non | false |
| bank_financing | boolean | non | false |
| description | text | oui |  |
| status | text | non | 'active'::text |
| created_at | timestamp with time zone | non | now() |
| updated_at | timestamp with time zone | non | now() |
| boosted_until | timestamp with time zone | oui |  |

**Contraintes :**
- `search_ads_buyer_type_check` : CHECK (((buyer_type IS NULL) OR (buyer_type = ANY (ARRAY['individuel'::text, 'entreprise'::text, 'investisseur'::text]))))
- `search_ads_owner_id_fkey` : FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
- `search_ads_pkey` : PRIMARY KEY (id)
- `search_ads_status_check` : CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text])))

**Policies RLS :**
- [ALL] `Owners manage their search ads` — USING: (owner_id = auth.uid()) — WITH CHECK: (owner_id = auth.uid())
- [SELECT] `Active search ads are public` — USING: ((status = 'active'::text) OR (owner_id = auth.uid()))

### `stripe_events`

| colonne | type | null | défaut |
|---|---|---|---|
| id | text | non |  |
| created_at | timestamp with time zone | non | now() |

**Contraintes :**
- `stripe_events_pkey` : PRIMARY KEY (id)

### `vdr_access_logs`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| document_id | uuid | non |  |
| viewer_id | uuid | non |  |
| viewed_at | timestamp with time zone | oui | timezone('utc'::text, now()) |

**Contraintes :**
- `vdr_access_logs_document_id_fkey` : FOREIGN KEY (document_id) REFERENCES vdr_documents(id) ON DELETE CASCADE
- `vdr_access_logs_pkey` : PRIMARY KEY (id)
- `vdr_access_logs_viewer_id_fkey` : FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE

**Policies RLS :**
- [INSERT] `Anyone can log access` — USING: — — WITH CHECK: true
- [SELECT] `Owners can view access logs` — USING: (auth.uid() IN ( SELECT l.owner_id    FROM (listings l      JOIN vdr_documents d ON ((d.listing_id = l.id)))   WHERE (d.id = vdr_access_logs.document_id)))

### `vdr_documents`

| colonne | type | null | défaut |
|---|---|---|---|
| id | uuid | non | gen_random_uuid() |
| listing_id | uuid | non |  |
| name | text | non |  |
| file_path | text | non |  |
| size_bytes | bigint | non |  |
| created_at | timestamp with time zone | oui | timezone('utc'::text, now()) |

**Contraintes :**
- `vdr_documents_listing_id_fkey` : FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
- `vdr_documents_pkey` : PRIMARY KEY (id)

**Policies RLS :**
- [ALL] `Owners manage VDR docs` — USING: (auth.uid() IN ( SELECT listings.owner_id    FROM listings   WHERE (listings.id = vdr_documents.listing_id)))
- [SELECT] `Buyers view VDR docs if NDA signed` — USING: (EXISTS ( SELECT 1    FROM ndas   WHERE ((ndas.listing_id = vdr_documents.listing_id) AND (ndas.buyer_id = auth.uid()) AND (ndas.status = 'signed'::text))))

## Vues

### `buyer_badges`

```sql
SELECT id,
    buyer_type,
    buyer_level,
    kyc_status
   FROM profiles;
```

### `geography_columns`

```sql
SELECT current_database() AS f_table_catalog,
    n.nspname AS f_table_schema,
    c.relname AS f_table_name,
    a.attname AS f_geography_column,
    postgis_typmod_dims(a.atttypmod) AS coord_dimension,
    postgis_typmod_srid(a.atttypmod) AS srid,
    postgis_typmod_type(a.atttypmod) AS type
   FROM pg_class c,
    pg_attribute a,
    pg_type t,
    pg_namespace n
  WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text);
```

### `geometry_columns`

```sql
SELECT current_database()::character varying(256) AS f_table_catalog,
    n.nspname AS f_table_schema,
    c.relname AS f_table_name,
    a.attname AS f_geometry_column,
    COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension,
    COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid,
    replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type
   FROM pg_class c
     JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped
     JOIN pg_namespace n ON c.relnamespace = n.oid
     JOIN pg_type t ON a.atttypid = t.oid
     LEFT JOIN ( SELECT s.connamespace,
            s.conrelid,
            s.conkey,
            replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type
           FROM ( SELECT pg_constraint.connamespace,
                    pg_constraint.conrelid,
                    pg_constraint.conkey,
                    pg_get_constraintdef(pg_constraint.oid) AS consrc
                   FROM pg_constraint) s
          WHERE s.consrc ~~* '%geometrytype(% = %'::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey))
     LEFT JOIN ( SELECT s.connamespace,
            s.conrelid,
            s.conkey,
            replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text)::integer AS ndims
           FROM ( SELECT pg_constraint.connamespace,
                    pg_constraint.conrelid,
                    pg_constraint.conkey,
                    pg_get_constraintdef(pg_constraint.oid) AS consrc
                   FROM pg_constraint) s
          WHERE s.consrc ~~* '%ndims(% = %'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey))
     LEFT JOIN ( SELECT s.connamespace,
            s.conrelid,
            s.conkey,
            replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text)::integer AS srid
           FROM ( SELECT pg_constraint.connamespace,
                    pg_constraint.conrelid,
                    pg_constraint.conkey,
                    pg_get_constraintdef(pg_constraint.oid) AS consrc
                   FROM pg_constraint) s
          WHERE s.consrc ~~* '%srid(% = %'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey))
  WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text);
```

### `safe_profiles`

```sql
SELECT id,
    full_name,
    avatar_url,
    bio,
    show_email,
    show_phone,
    updated_at,
    is_admin,
    kyc_status,
    plan_type AS plan,
        CASE
            WHEN show_email = true OR auth.uid() = id OR (EXISTS ( SELECT 1
               FROM profiles ap
              WHERE ap.id = auth.uid() AND ap.is_admin = true)) THEN contact_email
            ELSE NULL::text
        END AS contact_email,
        CASE
            WHEN show_phone = true OR auth.uid() = id OR (EXISTS ( SELECT 1
               FROM profiles ap
              WHERE ap.id = auth.uid() AND ap.is_admin = true)) THEN phone
            ELSE NULL::text
        END AS phone,
    plan_type,
    buyer_type,
    buyer_level,
    target_sectors,
    target_geo,
    target_budget,
    target_revenue,
    apport,
    experience,
    ambitions,
    ( SELECT count(*) AS count
           FROM profile_views v
          WHERE v.profile_id = p.id) AS profile_views_count
   FROM profiles p;
```

### `listings_secure`

```sql
SELECT l.id,
    l.name,
    l.siret,
    l.industry,
    l.address,
    l.lat,
    l.lng,
    l.location,
    l.price,
    l.rent,
    l.employees,
    l.surface,
    l.created_at,
    l.owner_id,
    l.logo_url,
    l.website_url,
    l.hide_siret,
    l.image_urls,
    l.established_year,
    l.requires_nda,
    l.management_type,
    l.client_concentration,
    l.digital_maturity,
    l.market_trend,
    l.is_premium,
    l.updated_at,
    l.status,
    l.last_confirmed_at,
    l.renewal_requested_at,
    l.inactive_since,
    l.renewal_reminder_sent_at,
    l.boosted_until,
    l.share_financials,
        CASE
            WHEN g.fin_ok THEN l.revenue_n1
            ELSE NULL::numeric
        END AS revenue_n1,
        CASE
            WHEN g.fin_ok THEN l.revenue_n2
            ELSE NULL::numeric
        END AS revenue_n2,
        CASE
            WHEN g.fin_ok THEN l.revenue_n3
            ELSE NULL::numeric
        END AS revenue_n3,
        CASE
            WHEN g.fin_ok THEN l.ebitda
            ELSE NULL::numeric
        END AS ebitda,
        CASE
            WHEN g.full_ok THEN l.description
            ELSE NULL::text
        END AS description,
        CASE
            WHEN g.full_ok THEN l.reason_for_selling
            ELSE NULL::text
        END AS reason_for_selling,
        CASE
            WHEN g.full_ok THEN l.lease_details
            ELSE NULL::text
        END AS lease_details,
    ( SELECT count(*) AS count
           FROM listing_views v
          WHERE v.listing_id = l.id) AS view_count,
    ( SELECT count(*) AS count
           FROM favorites f
          WHERE f.listing_id = l.id) AS favorites_count
   FROM listings l
     CROSS JOIN LATERAL ( SELECT auth.uid() IS NOT NULL AND (EXISTS ( SELECT 1
                   FROM profiles pa
                  WHERE pa.id = auth.uid() AND pa.is_admin = true)) AS is_admin,
            l.owner_id = auth.uid() AS is_owner,
            COALESCE(( SELECT p.plan_type
                   FROM profiles p
                  WHERE p.id = auth.uid()), 'free'::text) = ANY (ARRAY['pro'::text, 'business'::text, 'premium'::text]) AS is_paid,
            (EXISTS ( SELECT 1
                   FROM listing_unlocks u
                  WHERE u.user_id = auth.uid() AND u.target_type = 'listing'::text AND u.target_id = l.id)) AS is_unlocked) acc
     CROSS JOIN LATERAL ( SELECT acc.is_admin OR acc.is_owner OR acc.is_paid OR acc.is_unlocked AS full_ok,
            acc.is_admin OR acc.is_owner OR (acc.is_paid OR acc.is_unlocked) AND COALESCE(l.share_financials, false) AS fin_ok) g;
```

### `user_ratings_summary`

```sql
SELECT rated_id AS user_id,
    round(avg(score), 1) AS avg_score,
    count(*) AS rating_count
   FROM ratings
  WHERE status = 'published'::text
  GROUP BY rated_id;
```

## Fonctions

```sql
CREATE OR REPLACE FUNCTION public.confirm_listing_active(p_listing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.listings
  SET status = 'active',
      last_confirmed_at = now(),
      renewal_requested_at = NULL,
      inactive_since = NULL,
      renewal_reminder_sent_at = NULL
  WHERE id = p_listing_id
    AND owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annonce introuvable ou non autorisée';
  END IF;
END;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.handle_project_view()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.projects 
  SET view_count = view_count + 1 
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.moderate_low_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.score < 2.5 THEN
    NEW.status := 'under_review';
  END IF;
  RETURN NEW;
END;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.process_listing_lifecycle()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 90 jours sans confirmation -> demande de renouvellement
  UPDATE public.listings
  SET status = 'pending_renewal',
      renewal_requested_at = now(),
      renewal_reminder_sent_at = NULL
  WHERE status = 'active'
    AND last_confirmed_at < now() - interval '90 days';

  -- 10 jours sans réponse à la relance -> annonce en pause
  UPDATE public.listings
  SET status = 'inactive',
      inactive_since = now()
  WHERE status = 'pending_renewal'
    AND renewal_requested_at < now() - interval '10 days';

  -- 30 jours en pause -> suppression définitive
  DELETE FROM public.listings
  WHERE status = 'inactive'
    AND inactive_since < now() - interval '30 days';
END;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.protect_buyer_level()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.buyer_level IS DISTINCT FROM OLD.buyer_level THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin) THEN
      NEW.buyer_level := OLD.buyer_level;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.protect_project_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin) THEN
      IF NEW.verification_status <> 'en_attente' OR OLD.verification_status IN ('verifie') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.set_prospect_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end $function$
```

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
```
