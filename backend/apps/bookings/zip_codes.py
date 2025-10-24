# apps/bookings/zip_codes.py
"""
ToteTaxi Geographic ZIP Code System
Validates service areas and determines surcharge requirements
"""

# Zone 1: CORE AREA (Standard Pricing - No Surcharge)
CORE_AREA_ZIPS = {
    'manhattan': [
        '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10009', '10010', '10011',
        '10012', '10013', '10014', '10016', '10017', '10018', '10019', '10020', '10021', '10022',
        '10023', '10024', '10025', '10026', '10027', '10028', '10029', '10030', '10031', '10032',
        '10033', '10034', '10035', '10036', '10038', '10039', '10040', '10044', '10065', '10069',
        '10075', '10103', '10110', '10111', '10112', '10115', '10119', '10128', '10152', '10153',
        '10154', '10162', '10165', '10167', '10168', '10169', '10170', '10171', '10172', '10173',
        '10174', '10177', '10199', '10271', '10278', '10279', '10280', '10281', '10282'
    ],
    
    'hamptons_west': [
        '11972',  # Speonk
        '11946',  # Hampton Bays
        '11959',  # Quogue
        '11977',  # Westhampton
        '11978',  # Westhampton Beach
        '11968',  # Southampton
        '11976',  # Water Mill
        '11932',  # Bridgehampton
        '11962',  # Sagaponack
        '11963',  # Sag Harbor
        '11975',  # Wainscott
    ],
    
    'brooklyn': [
        '11201', '11203', '11204', '11205', '11206', '11207', '11208', '11209', '11210', '11211',
        '11212', '11213', '11214', '11215', '11216', '11217', '11218', '11219', '11220', '11221',
        '11222', '11223', '11224', '11225', '11226', '11228', '11229', '11230', '11231', '11232',
        '11233', '11234', '11235', '11236', '11237', '11238', '11239', '11241', '11242', '11243',
        '11245', '11247', '11249', '11251', '11252', '11256'
    ]
}

# Zone 2: SURCHARGE AREA (+$175 Distance Fee)
SURCHARGE_AREA_ZIPS = {
    'essex_county_nj': [
        '07003', '07004', '07006', '07007', '07009', '07017', '07018', '07019', '07021', '07028',
        '07039', '07040', '07041', '07042', '07043', '07044', '07050', '07051', '07052', '07068',
        '07078', '07079', '07101', '07102', '07103', '07104', '07105', '07106', '07107', '07108',
        '07109', '07110', '07111', '07112', '07114', '07175', '07184', '07188', '07189', '07191',
        '07192', '07193', '07195', '07198', '07199'
    ],
    
    'union_county_nj': [
        '07016', '07023', '07027', '07033', '07036', '07060', '07062', '07063', '07065', '07066',
        '07076', '07081', '07083', '07088', '07090', '07092', '07201', '07202', '07203', '07204',
        '07205', '07206', '07208', '07901', '07974'
    ],
    
    'morris_county_nj': [
        '07005', '07035', '07054', '07801', '07834', '07856', '07866', '07869', '07928', '07932',
        '07936', '07940', '07950', '07960', '07981'
    ],
    
    'hudson_county_nj': [
        '07002', '07030', '07032', '07047', '07086', '07087', '07093', '07094', '07302', '07304',
        '07305', '07306', '07307', '07310'
    ],
    
    'fairfield_county_ct': [
        '06604', '06605', '06606', '06607', '06608', '06610', '06611', '06612', '06614', '06615',
        '06807', '06820', '06824', '06825', '06830', '06831', '06840', '06850', '06851', '06853',
        '06854', '06855', '06877', '06880', '06883', '06897', '06901', '06902', '06903', '06905',
        '06906', '06907'
    ],
    
    'new_haven_county_ct': [
        '06401', '06418', '06460', '06477', '06484', '06510', '06511', '06512', '06513', '06515',
        '06516', '06519'
    ],
    
    'hamptons_east': [
        '11930',  # Amagansett
        '11954',  # Montauk
        '11964',  # Shelter Island
    ]
}

# Flatten for fast lookup (O(1) set operations)
CORE_AREA_ZIPS_FLAT = set()
for region_zips in CORE_AREA_ZIPS.values():
    CORE_AREA_ZIPS_FLAT.update(region_zips)

SURCHARGE_AREA_ZIPS_FLAT = set()
for region_zips in SURCHARGE_AREA_ZIPS.values():
    SURCHARGE_AREA_ZIPS_FLAT.update(region_zips)


def validate_service_area(zip_code):
    """
    Validate ZIP code and determine surcharge requirement.
    
    Args:
        zip_code (str): ZIP code to validate (can include -XXXX extension)
    
    Returns:
        tuple: (is_serviceable, requires_surcharge, zone_name, error_message)
        
    Examples:
        >>> validate_service_area('10001')
        (True, False, 'core', None)
        
        >>> validate_service_area('07101')
        (True, True, 'surcharge', None)
        
        >>> validate_service_area('11354')
        (False, False, None, 'Sorry, we don\'t service ZIP code 11354...')
    """
    if not zip_code:
        return False, False, None, "ZIP code is required"
    
    # Clean ZIP (remove -XXXX extension if present)
    clean_zip = zip_code.split('-')[0].strip()
    
    # Check core area (no surcharge)
    if clean_zip in CORE_AREA_ZIPS_FLAT:
        return True, False, "core", None
    
    # Check surcharge area (+$175)
    if clean_zip in SURCHARGE_AREA_ZIPS_FLAT:
        return True, True, "surcharge", None
    
    # Not serviceable
    error_msg = (
        f"Sorry, we don't currently service ZIP code {clean_zip}. "
        f"We serve Manhattan, the Hamptons, Brooklyn, and select areas in NJ and CT."
    )
    return False, False, None, error_msg


def get_service_areas():
    """
    Return all service areas for frontend display or admin reference.
    
    Returns:
        dict: Dictionary with core and surcharge area ZIP codes
    """
    return {
        'core_areas': CORE_AREA_ZIPS,
        'surcharge_areas': SURCHARGE_AREA_ZIPS,
        'stats': {
            'core_count': len(CORE_AREA_ZIPS_FLAT),
            'surcharge_count': len(SURCHARGE_AREA_ZIPS_FLAT),
            'total_serviceable': len(CORE_AREA_ZIPS_FLAT) + len(SURCHARGE_AREA_ZIPS_FLAT)
        }
    }