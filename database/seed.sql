-- Seed Data for Real Estate Development Intelligence Platform

-- Users (passwords are bcrypt hashed version of 'Password@123')
INSERT INTO users (id, email, password_hash, name, role, phone) VALUES
(
    'a1b2c3d4-0000-0000-0000-000000000001',
    'admin@redevint.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6J3K5Z6vN6',
    'Arjun Sharma',
    'admin',
    '+91-9876543210'
),
(
    'a1b2c3d4-0000-0000-0000-000000000002',
    'analyst@redevint.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6J3K5Z6vN6',
    'Priya Menon',
    'analyst',
    '+91-9876543211'
),
(
    'a1b2c3d4-0000-0000-0000-000000000003',
    'viewer@redevint.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6J3K5Z6vN6',
    'Rahul Verma',
    'viewer',
    '+91-9876543212'
);

-- Properties
INSERT INTO properties (id, name, address, city, state, pincode, lat, lng, survey_number, owner_name, land_area_sqft, zoning, circle_rate_per_sqft, permissible_fsi, road_width_mtrs, created_by) VALUES
(
    'b1b2c3d4-0000-0000-0000-000000000001',
    'Bandra West Premium Plot',
    'Plot No. 14, Turner Road, Bandra West',
    'Mumbai',
    'Maharashtra',
    '400050',
    19.0596,
    72.8295,
    'CTS No. 1234/A',
    'M/s Mehta Properties Pvt Ltd',
    25000.00,
    'residential',
    65000.00,
    3.00,
    18.0,
    'a1b2c3d4-0000-0000-0000-000000000001'
),
(
    'b1b2c3d4-0000-0000-0000-000000000002',
    'Whitefield Tech Corridor Land',
    'Survey No. 45, Whitefield Main Road',
    'Bangalore',
    'Karnataka',
    '560066',
    12.9698,
    77.7500,
    'Sy. No. 45/2',
    'Karnataka State Industrial Areas Development Board',
    87000.00,
    'commercial',
    12000.00,
    4.00,
    30.0,
    'a1b2c3d4-0000-0000-0000-000000000001'
),
(
    'b1b2c3d4-0000-0000-0000-000000000003',
    'Hitech City Mixed-Use Site',
    'Plot No. 78, HITEC City Phase 2',
    'Hyderabad',
    'Telangana',
    '500081',
    17.4435,
    78.3772,
    'Sy. No. 78/B',
    'Hyderabad Metropolitan Development Authority',
    120000.00,
    'mixed_use',
    8500.00,
    5.00,
    40.0,
    'a1b2c3d4-0000-0000-0000-000000000002'
),
(
    'b1b2c3d4-0000-0000-0000-000000000004',
    'Powai Lake View Development',
    'Plot No. 22, Hiranandani Gardens, Powai',
    'Mumbai',
    'Maharashtra',
    '400076',
    19.1196,
    72.9053,
    'CTS No. 5678/B',
    'Hiranandani Group',
    45000.00,
    'residential',
    55000.00,
    2.50,
    24.0,
    'a1b2c3d4-0000-0000-0000-000000000001'
),
(
    'b1b2c3d4-0000-0000-0000-000000000005',
    'Electronic City Industrial Plot',
    'Survey No. 112, Electronic City Phase 1',
    'Bangalore',
    'Karnataka',
    '560100',
    12.8399,
    77.6770,
    'Sy. No. 112/A',
    'KIADB',
    200000.00,
    'industrial',
    3500.00,
    2.50,
    24.0,
    'a1b2c3d4-0000-0000-0000-000000000002'
);

-- Deals
INSERT INTO deals (id, property_id, name, deal_type, stage, assigned_to, target_launch_date, land_ask_price_cr, notes, created_by) VALUES
(
    'c1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000001',
    'Bandra West Luxury Residences',
    'outright',
    'underwriting',
    'a1b2c3d4-0000-0000-0000-000000000002',
    '2025-03-01',
    165.00,
    'Premium luxury residential project. High demand area. Seller motivated for quick close.',
    'a1b2c3d4-0000-0000-0000-000000000001'
),
(
    'c1b2c3d4-0000-0000-0000-000000000002',
    'b1b2c3d4-0000-0000-0000-000000000002',
    'Whitefield Tech Park Development',
    'jv',
    'loi',
    'a1b2c3d4-0000-0000-0000-000000000002',
    '2025-06-01',
    95.00,
    'JV with KIADB. Grade A office development for tech companies. Strong pre-lease interest.',
    'a1b2c3d4-0000-0000-0000-000000000001'
),
(
    'c1b2c3d4-0000-0000-0000-000000000003',
    'b1b2c3d4-0000-0000-0000-000000000003',
    'Hitech City Township',
    'da',
    'active',
    'a1b2c3d4-0000-0000-0000-000000000001',
    '2024-12-01',
    180.00,
    'Development Agreement with HMDA. Mixed-use township with residential, retail and office. RERA registered.',
    'a1b2c3d4-0000-0000-0000-000000000001'
),
(
    'c1b2c3d4-0000-0000-0000-000000000004',
    'b1b2c3d4-0000-0000-0000-000000000004',
    'Powai Premium Apartments',
    'acquisition',
    'screening',
    'a1b2c3d4-0000-0000-0000-000000000002',
    '2025-09-01',
    210.00,
    'Initial screening. Excellent location near Powai lake. High-end 3 and 4 BHK apartments target segment.',
    'a1b2c3d4-0000-0000-0000-000000000001'
);

-- Deal Stage History
INSERT INTO deal_stage_history (deal_id, from_stage, to_stage, changed_by, notes) VALUES
('c1b2c3d4-0000-0000-0000-000000000001', NULL, 'screening', 'a1b2c3d4-0000-0000-0000-000000000001', 'Deal initiated'),
('c1b2c3d4-0000-0000-0000-000000000001', 'screening', 'site_visit', 'a1b2c3d4-0000-0000-0000-000000000001', 'Site visit scheduled with owner'),
('c1b2c3d4-0000-0000-0000-000000000001', 'site_visit', 'loi', 'a1b2c3d4-0000-0000-0000-000000000001', 'Site visit positive, issuing LOI'),
('c1b2c3d4-0000-0000-0000-000000000001', 'loi', 'underwriting', 'a1b2c3d4-0000-0000-0000-000000000002', 'LOI accepted, starting detailed underwriting'),
('c1b2c3d4-0000-0000-0000-000000000002', NULL, 'screening', 'a1b2c3d4-0000-0000-0000-000000000001', 'Deal initiated'),
('c1b2c3d4-0000-0000-0000-000000000002', 'screening', 'site_visit', 'a1b2c3d4-0000-0000-0000-000000000001', 'Technical team to visit'),
('c1b2c3d4-0000-0000-0000-000000000002', 'site_visit', 'loi', 'a1b2c3d4-0000-0000-0000-000000000002', 'Site visit done, LOI submitted'),
('c1b2c3d4-0000-0000-0000-000000000003', NULL, 'screening', 'a1b2c3d4-0000-0000-0000-000000000001', 'Deal initiated'),
('c1b2c3d4-0000-0000-0000-000000000003', 'screening', 'site_visit', 'a1b2c3d4-0000-0000-0000-000000000001', ''),
('c1b2c3d4-0000-0000-0000-000000000003', 'site_visit', 'loi', 'a1b2c3d4-0000-0000-0000-000000000001', ''),
('c1b2c3d4-0000-0000-0000-000000000003', 'loi', 'underwriting', 'a1b2c3d4-0000-0000-0000-000000000001', ''),
('c1b2c3d4-0000-0000-0000-000000000003', 'underwriting', 'active', 'a1b2c3d4-0000-0000-0000-000000000001', 'Deal approved by investment committee'),
('c1b2c3d4-0000-0000-0000-000000000004', NULL, 'screening', 'a1b2c3d4-0000-0000-0000-000000000001', 'Deal initiated');

-- Financials
INSERT INTO financials (deal_id, land_cost_cr, plot_area_sqft, fsi, loading_factor, construction_cost_per_sqft, selling_rate_per_sqft, approval_cost_cr, marketing_cost_pct, finance_cost_pct, developer_margin_pct, project_duration_months, gross_area_sqft, saleable_area_sqft, carpet_area_sqft, super_builtup_area_sqft, total_construction_cost_cr, gst_cost_cr, stamp_duty_cr, marketing_cost_cr, finance_cost_cr, total_cost_cr, total_revenue_cr, gross_profit_cr, gross_margin_pct, irr_pct, npv_cr, residual_land_value_cr, cash_flows, sensitivity_matrix) VALUES
(
    'c1b2c3d4-0000-0000-0000-000000000001',
    155.00,
    25000.00,
    3.00,
    0.65,
    4500.00,
    42000.00,
    8.50,
    3.50,
    12.00,
    20.00,
    42,
    75000.00,
    48750.00,
    34125.00,
    51187.50,
    21.94,
    3.95,
    7.75,
    7.20,
    21.23,
    225.57,
    204.75,
    -20.82,
    -10.17,
    18.5,
    12.3,
    22.5,
    '{"quarterly": [{"quarter": 1, "inflow": 0, "outflow": -45.5, "net": -45.5}, {"quarter": 2, "inflow": 25.2, "outflow": -38.2, "net": -13.0}, {"quarter": 3, "inflow": 45.8, "outflow": -28.5, "net": 17.3}, {"quarter": 4, "inflow": 62.5, "outflow": -22.0, "net": 40.5}, {"quarter": 5, "inflow": 71.25, "outflow": -15.0, "net": 56.25}]}',
    '{"selling_rates": [35000, 38500, 42000, 45500, 49000], "construction_costs": [3600, 4050, 4500, 4950, 5400], "irr_grid": [[8.2, 10.1, 12.5, 14.8, 16.9], [10.5, 12.8, 15.2, 17.5, 19.8], [13.1, 15.6, 18.5, 21.0, 23.4], [15.8, 18.5, 21.5, 24.2, 26.8], [18.2, 21.2, 24.5, 27.5, 30.2]]}'
),
(
    'c1b2c3d4-0000-0000-0000-000000000003',
    175.00,
    120000.00,
    5.00,
    0.65,
    3800.00,
    12500.00,
    22.00,
    4.00,
    13.00,
    22.00,
    54,
    600000.00,
    390000.00,
    273000.00,
    409500.00,
    148.20,
    26.68,
    8.75,
    19.50,
    42.15,
    442.28,
    487.50,
    45.22,
    9.28,
    22.8,
    38.5,
    85.0,
    '{"quarterly": [{"quarter": 1, "inflow": 0, "outflow": -85.0, "net": -85.0}, {"quarter": 2, "inflow": 45.0, "outflow": -72.0, "net": -27.0}, {"quarter": 3, "inflow": 95.0, "outflow": -65.0, "net": 30.0}, {"quarter": 4, "inflow": 120.0, "outflow": -55.0, "net": 65.0}, {"quarter": 5, "inflow": 145.0, "outflow": -42.0, "net": 103.0}, {"quarter": 6, "inflow": 82.5, "outflow": -18.0, "net": 64.5}]}',
    '{"selling_rates": [10000, 11250, 12500, 13750, 15000], "construction_costs": [3040, 3420, 3800, 4180, 4560], "irr_grid": [[12.5, 15.2, 18.1, 20.8, 23.5], [15.8, 18.5, 21.5, 24.2, 26.8], [19.2, 22.1, 25.2, 28.0, 30.8], [22.8, 25.9, 29.1, 32.2, 35.1], [26.5, 29.8, 33.2, 36.5, 39.8]]}'
);

-- Comps
INSERT INTO comps (project_name, developer, city, locality, lat, lng, project_type, bhk_config, carpet_area_sqft, super_builtup_area_sqft, rate_per_sqft, total_units, launch_year, rera_number, source) VALUES
('Lodha World Crest', 'Lodha Group', 'Mumbai', 'Worli', 18.9969, 72.8191, 'residential', '3 BHK, 4 BHK', 1800.00, 2250.00, 58000.00, 350, 2022, 'P51800022345', 'MagicBricks'),
('Kalpataru Paramount', 'Kalpataru', 'Mumbai', 'Thane West', 19.2183, 72.9781, 'residential', '2 BHK, 3 BHK', 950.00, 1185.00, 18500.00, 480, 2023, 'P51700028901', '99acres'),
('Prestige Lakeside Habitat', 'Prestige Group', 'Bangalore', 'Whitefield', 12.9698, 77.7500, 'residential', '1 BHK, 2 BHK, 3 BHK', 720.00, 900.00, 9800.00, 3426, 2021, 'PRM/KA/RERA/1251/309/PR', 'Housing.com'),
('Sobha Dream Acres', 'Sobha Developers', 'Bangalore', 'Panathur', 12.9329, 77.6822, 'residential', '1 BHK, 2 BHK', 650.00, 812.00, 8900.00, 4500, 2020, 'PRM/KA/RERA/1251/310/PR', 'MagicBricks'),
('My Home Avatar', 'My Home Group', 'Hyderabad', 'HITEC City', 17.4435, 78.3772, 'residential', '2 BHK, 3 BHK, 4 BHK', 1100.00, 1375.00, 11500.00, 2880, 2022, 'P02400003456', '99acres'),
('Aparna Constructions Sarovar', 'Aparna Constructions', 'Hyderabad', 'Kondapur', 17.4651, 78.3589, 'residential', '2 BHK, 3 BHK', 950.00, 1185.00, 10200.00, 560, 2023, 'P02400005678', 'Housing.com'),
('Oberoi Commerz III', 'Oberoi Realty', 'Mumbai', 'Goregaon East', 19.1597, 72.8484, 'commercial', 'Office', NULL, 20000.00, 22000.00, 120, 2021, 'P51800033456', 'PropTiger'),
('RMZ Ecoworld', 'RMZ Corp', 'Bangalore', 'Bellandur', 12.9247, 77.6743, 'commercial', 'Grade A Office', NULL, 45000.00, 18500.00, 6, 2019, 'PRM/KA/RERA/1251/002/CO', 'JLL India'),
('Phoenix Palassio', 'Phoenix Mills', 'Hyderabad', 'Kondapur', 17.4651, 78.3589, 'mixed_use', 'Retail + Office', NULL, NULL, 32000.00, 1, 2023, 'P02400007890', 'Economic Times');

-- Activities
INSERT INTO activities (deal_id, activity_type, description, performed_by, activity_date) VALUES
('c1b2c3d4-0000-0000-0000-000000000001', 'site_visit', 'Conducted detailed site visit. Confirmed land area 25000 sqft as per survey. Road width 18m confirmed. No encumbrances visible. Owner cooperative.', 'a1b2c3d4-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days'),
('c1b2c3d4-0000-0000-0000-000000000001', 'meeting', 'Met with owner Mehta Properties. Discussed price. They are asking 165 Cr, we offered 150 Cr. Gap of 15 Cr. Further negotiation needed.', 'a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'),
('c1b2c3d4-0000-0000-0000-000000000001', 'loi_sent', 'Sent LOI at 155 Cr with subject-to conditions: clear title, FSI confirmation, 30-day exclusivity.', 'a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days'),
('c1b2c3d4-0000-0000-0000-000000000001', 'call', 'Follow up call with owner. They accepted 155 Cr. Proceeding to underwriting.', 'a1b2c3d4-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days'),
('c1b2c3d4-0000-0000-0000-000000000002', 'meeting', 'Initial meeting with KIADB officials. JV structure discussed - 60:40 developer:landowner revenue share proposed.', 'a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days'),
('c1b2c3d4-0000-0000-0000-000000000002', 'site_visit', 'Site visit with technical team. Soil testing samples collected. Good ground conditions for commercial development.', 'a1b2c3d4-0000-0000-0000-000000000002', NOW() - INTERVAL '12 days'),
('c1b2c3d4-0000-0000-0000-000000000002', 'loi_sent', 'LOI submitted to KIADB with proposed 70:30 revenue share structure and development timeline.', 'a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
('c1b2c3d4-0000-0000-0000-000000000003', 'note', 'RERA registered. All approvals in place. Construction has commenced Phase 1. Strong sales velocity expected.', 'a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days'),
('c1b2c3d4-0000-0000-0000-000000000003', 'meeting', 'IC approval received. Project green-lighted. Mobilizing construction team.', 'a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days'),
('c1b2c3d4-0000-0000-0000-000000000003', 'email', 'Sent project brief to anchor investors. Strong interest from 3 institutional investors.', 'a1b2c3d4-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days'),
('c1b2c3d4-0000-0000-0000-000000000004', 'call', 'Initial call with broker Hiranandani Group. Excellent lake-facing plot. Need to verify FSI allowances.', 'a1b2c3d4-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days');
