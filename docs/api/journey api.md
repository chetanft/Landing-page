curl 'https://api.freighttiger.com/api/journey-snapshot/v1/journeys/JRN-b1e94fd9-9ee9-42b2-ad40-b938593794ec/details/tracking?entity_type=CNR&journey_stop_type=source&journey_direction=outbound' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer  \
  -H 'content-type: application/json' \
  -H 'origin: https://www.freighttiger.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://www.freighttiger.com/' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'

  {
    "success": true,
    "data": {
        "created_on": "2026-02-04 10:45:49",
        "ETA": "2026-02-04 13:10:29",
        "STA": "2026-02-04 13:10:29",
        "time_to_reach_destination": 17,
        "delay_in_minutes": null,
        "journey_direction": "outbound",
        "journey_status": "IN_TRANSIT",
        "is_closed": false,
        "journey_fteid": "JRN-b1e94fd9-9ee9-42b2-ad40-b938593794ec",
        "total_journey_distance": 514.588,
        "travelled_average_speed": 32.10565194986412,
        "distance_covered": 45.777308738514584,
        "avg_distance_covered": 45.777308738514584,
        "last_known_location": "CM4Q+82 Mangalduari, West Bengal, India",
        "last_ping": 1770207966000,
        "is_round_trip": false,
        "indent": {
            "indent_number": null,
            "indent_status": ""
        },
        "transit_sla_in_hrs": null,
        "closed_at": null,
        "onboarded_stt_minutes": null,
        "feed_unique_id": "MH04JK7459._03022026",
        "load_type": null,
        "sales_rep_id": null,
        "freight_rate": null,
        "freight_rate_unit": null,
        "freight_value_currency": null,
        "freight_value": null,
        "vehicle_type_ref_code": null,
        "trip_type": "",
        "tracking_data": {
            "ping_source": "sim",
            "sim_consent_status": "Y",
            "tracking_strength": 100,
            "available_source": [
                "SIM",
                "FST"
            ],
            "available_from": null
        },
        "vehicle_info": {
            "vehicle_number": null,
            "vehcile_fteid": null,
            "vehicle_assigned_at": null
        },
        "driver_info": [
            {
                "number": "7004725275",
                "name": "SURESH HARI SHANKAR YADAV",
                "lcu_ids": [
                    375664
                ],
                "license_number": null,
                "consent_details": {
                    "country_code": "91",
                    "carrier": "jio",
                    "consent_completed_timestamp": 1770202166686,
                    "bypass_missed_call": false,
                    "tracking_status": "supported",
                    "missed_call_timestamp": null,
                    "missed_call_received": false,
                    "consent_status": "Accepted",
                    "next_consent_steps": "Consent process completed, sms was received at 2026-02-04 16:19:26.686364 IST",
                    "mobile_number": "7004725275",
                    "consent_initiated_timestamp": 1747813274470,
                    "consent_steps": [
                        "Give a missed call to 9982256700 or send \"Y\" to 51712025 or 5575701"
                    ]
                }
            }
        ],
        "transporter_info": {
            "transporter_name": "",
            "transporter_number": ""
        },
        "pre_transit_info": {
            "distance_travelled_in_kms": null,
            "time_spent_in_hr": null,
            "ETA": null,
            "is_pre_transit": false
        },
        "journey_summary": {
            "pre_transit": [],
            "forward_leg": [
                {
                    "journey_stop_action": [
                        "pickup"
                    ],
                    "journey_stop_type": "origin",
                    "ETA": null,
                    "branch_name": "SSLPL - Consolidation Center Jamshedpur",
                    "company_name": "TATA MOTORS LIMITED ",
                    "display_name": "TATA MOTORS LIMITED -SSLPL - Consolidation Center Jamshedpur",
                    "branch_address": "SSLPL_CC Jamshedpur-Road No  3, Phase  2, Krishnapur Industrial Area, Adityapur, Near Sudisha Unit  2, Jamshedpur  832109, Dist. - Serailkela Kharsawan, Jharkhand.",
                    "branch_address_label": "SSLPL_Consolidation_Center_Jamshedpur",
                    "phone_number": null,
                    "point": {
                        "lon": 86.142707,
                        "lat": 22.7977778
                    },
                    "leg_id": 524564,
                    "lr_number": null,
                    "distance_travelled_in_kms": 0,
                    "total_time_travelled": 0,
                    "leg_state": "UNKNOWN",
                    "is_achieved": false,
                    "is_active_stop": false,
                    "stop_id": 922169,
                    "sta": null,
                    "std": null,
                    "gate_in": null,
                    "gate_out": null,
                    "primary_geofence": {
                        "radius": 3000,
                        "polygon_geofence_coordinates": []
                    },
                    "secondary_geofence": [],
                    "entry_time": null,
                    "exit_time": null,
                    "loads": [
                        {
                            "load_id": 534165,
                            "load_reference_number": "LOAD-1770201949045",
                            "eway_bill_no": [
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null
                            ]
                        }
                    ],
                    "is_completed": false
                },
                {
                    "journey_stop_action": [
                        "drop"
                    ],
                    "journey_stop_type": "destination",
                    "ETA": "2026-02-04 13:10:29",
                    "branch_name": "SPD HOWRAH",
                    "company_name": "TATA MOTORS LIMITED ",
                    "display_name": "TATA MOTORS LIMITED -SPD HOWRAH",
                    "branch_address": "SPD HOWRAH-TATA MOTORS LIMITED-\" Tml-C/O Ndr Warehousing Pvt Ltd  Raghudevpur East Panchla\"",
                    "branch_address_label": "SPD HOWRAH",
                    "phone_number": "9073961706,7439976235",
                    "point": {
                        "lon": 88.1417207995,
                        "lat": 22.525053435
                    },
                    "lr_number": null,
                    "is_achieved": false,
                    "is_active_stop": false,
                    "stop_id": 922184,
                    "sta": "2026-02-04 13:10:29",
                    "std": null,
                    "gate_in": null,
                    "gate_out": null,
                    "primary_geofence": {
                        "radius": 3000,
                        "polygon_geofence_coordinates": [
                            {
                                "area": null,
                                "pincode": null,
                                "address": null,
                                "latitude": 22.52668717643318,
                                "region": null,
                                "longitude": 88.14146450856046
                            },
                            {
                                "area": null,
                                "pincode": null,
                                "address": null,
                                "latitude": 22.52458618987455,
                                "region": null,
                                "longitude": 88.14579895832853
                            },
                            {
                                "area": null,
                                "pincode": null,
                                "address": null,
                                "latitude": 22.521771610641252,
                                "region": null,
                                "longitude": 88.14369610646085
                            },
                            {
                                "area": null,
                                "pincode": null,
                                "address": null,
                                "latitude": 22.524031206958334,
                                "region": null,
                                "longitude": 88.13931874134855
                            }
                        ]
                    },
                    "secondary_geofence": [],
                    "entry_time": null,
                    "exit_time": null,
                    "loads": [
                        {
                            "load_id": 534165,
                            "load_reference_number": "LOAD-1770201949045",
                            "eway_bill_no": [
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null
                            ]
                        }
                    ],
                    "is_completed": false
                }
            ],
            "return_leg": [],
            "forward_leg_distance_travelled": 45.777308738514584,
            "forward_leg_total_distance": 514.588,
            "forward_leg_trip_time": 1.4258333333333333,
            "return_leg_distance_travelled": 0,
            "return_leg_total_distance": 0,
            "return_leg_trip_time": 0,
            "stoppage_time": null,
            "current_status": "IN_TRANSIT",
            "pre_transit_trip_time": null,
            "pre_transit_trip_distance": null,
            "drops_completed": 0,
            "total_drops": 1,
            "pod_submitted": 0,
            "total_pod": 0,
            "distance_travelled_in_kms": 45.777308738514584,
            "time_spent_in_hr": 1.4258333333333333,
            "current_active_leg_id": "524553"
        },
        "planned_route": [
            {
                "journey_stop_action": [
                    "pickup"
                ],
                "journey_stop_type": "origin",
                "ETA": null,
                "branch_name": "TATA MOTORS LIMITED ",
                "branch_address": "SSLPL_CC Jamshedpur-Road No  3, Phase  2, Krishnapur Industrial Area, Adityapur, Near Sudisha Unit  2, Jamshedpur  832109, Dist. - Serailkela Kharsawan, Jharkhand.",
                "branch_address_label": "SSLPL_Consolidation_Center_Jamshedpur",
                "phone_number": null,
                "invoice": [
                    {
                        "invoice_number": "325225499",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "325225500",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "325225530",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "325225502",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8471",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8456",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "2656007425",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "2656007424",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "251117308",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8465",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8469",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8464",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8475",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "251117307",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8461",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8462",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8460",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "2526116512",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8459",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "251117305",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8473",
                        "eway_bill_no": null
                    }
                ],
                "point": {
                    "lon": 86.142707,
                    "lat": 22.7977778
                },
                "is_achieved": true
            },
            {
                "journey_stop_action": [
                    "drop"
                ],
                "journey_stop_type": "destination",
                "ETA": "2026-02-04 13:10:29",
                "branch_name": "TATA MOTORS LIMITED ",
                "branch_address": "SPD HOWRAH-TATA MOTORS LIMITED-\" Tml-C/O Ndr Warehousing Pvt Ltd  Raghudevpur East Panchla\"",
                "branch_address_label": "SPD HOWRAH",
                "phone_number": "9073961706,7439976235",
                "invoice": [
                    {
                        "invoice_number": "325225499",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "325225500",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "325225530",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "325225502",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8471",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8456",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "2656007425",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "2656007424",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "251117308",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8465",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8469",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8464",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8475",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "251117307",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8461",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8462",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8460",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "2526116512",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8459",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "251117305",
                        "eway_bill_no": null
                    },
                    {
                        "invoice_number": "8473",
                        "eway_bill_no": null
                    }
                ],
                "point": {
                    "lon": 88.1417207995,
                    "lat": 22.525053435
                },
                "is_achieved": false
            }
        ],
        "comments": [],
        "lcu": [
            {
                "status": "active",
                "tracking_source": "sim",
                "start_time": 1770202833000,
                "end_time": 1770207966000,
                "lr_number": null,
                "transport_mode": "road",
                "origin": "SSLPL_CC Jamshedpur-Road No  3, Phase  2, Krishnapur Industrial Area, Adityapur, Near Sudisha Unit  2, Jamshedpur  832109, Dist. - Serailkela Kharsawan, Jharkhand.",
                "destination": "SPD HOWRAH-TATA MOTORS LIMITED-\" Tml-C/O Ndr Warehousing Pvt Ltd  Raghudevpur East Panchla\"",
                "transporter_name": null,
                "vehicle_type_name": null,
                "vehicle_number": "MH04JK7459.",
                "transporter_info": [],
                "driver_info": [
                    {
                        "number": "7004725275",
                        "name": "SURESH HARI SHANKAR YADAV",
                        "lcu_ids": [
                            375664
                        ],
                        "license_number": null,
                        "consent_details": {
                            "country_code": "91",
                            "carrier": "jio",
                            "consent_completed_timestamp": 1770202166686,
                            "bypass_missed_call": false,
                            "tracking_status": "supported",
                            "missed_call_timestamp": null,
                            "missed_call_received": false,
                            "consent_status": "Accepted",
                            "next_consent_steps": "Consent process completed, sms was received at 2026-02-04 16:19:26.686364 IST",
                            "mobile_number": "7004725275",
                            "consent_initiated_timestamp": 1747813274470,
                            "consent_steps": [
                                "Give a missed call to 9982256700 or send \"Y\" to 51712025 or 5575701"
                            ]
                        }
                    }
                ]
            }
        ],
        "closure_details": {
            "closed_at": null,
            "closed_reason": "",
            "closure_mode": ""
        }
    }
}





curl 'https://api.freighttiger.com/api/epod-service-v2/v1/journey-fte/pod-summary/journey_fteid/JRN-b1e94fd9-9ee9-42b2-ad40-b938593794ec' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'origin: https://www.freighttiger.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://www.freighttiger.com/' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'token: ' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'

  {
    "success": true,
    "data": {
        "534165": {
            "status": "PENDING_SUBMISSION"
        },
        "total_number_of_pods": 1,
        "pods_submitted": 0,
        "pods_approved": 0,
        "pods_rejected": 0,
        "pods_disputed": 0,
        "journey_epod_status": "PENDING_SUBMISSION",
        "pod_submission_pending": 1,
        "pod_approval_pending": 0,
        "pod_verfied_as_clean": 0,
        "pod_verfied_as_unclean": 0
    }
}






curl 'https://api.freighttiger.com/api/journey-snapshot/v1/journeys/JRN-b1e94fd9-9ee9-42b2-ad40-b938593794ec/details/alerts?entity_type=CNR&journey_stop_type=source&journey_direction=outbound' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer ' \
  -H 'content-type: application/json' \
  -H 'origin: https://www.freighttiger.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://www.freighttiger.com/' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'


  {
    "success": true,
    "data": {
        "journey_fteid": "JRN-b1e94fd9-9ee9-42b2-ad40-b938593794ec",
        "alerts": [
            {
                "journey_fteid": "JRN-b1e94fd9-9ee9-42b2-ad40-b938593794ec",
                "alert_id": "d06ac193-e689-488b-a850-ac1bfd6f48d9",
                "entity_id": "BRH-6573c6cd-e591-4eb4-90db-252fcfbe1103",
                "alert_type": "discrete",
                "alert_name": "untracked",
                "alert_status": "IN_PROGRESS",
                "generated_at": null,
                "changed_at": null,
                "created_at": null,
                "last_ping_received": null,
                "ticket": {},
                "alert_start_location": "Unknown location (no pings received)",
                "alert_start_position": {
                    "lon": 0,
                    "lat": 0
                },
                "alert_current_location": "Unknown location (no pings received)",
                "alert_current_position": null,
                "alert_duration": 61,
                "eta": null,
                "transit_delay": null,
                "alert_stage_type": "leg",
                "alert_stage_id": "524553",
                "alert_display_text": "Untracked for 60m",
                "alert_close_time": null,
                "alert_start_time": "2026-02-04T10:45:49Z",
                "alert_visualization_type": "point",
                "is_pre_transit_alert": false,
                "stop_alerts": []
            }
        ]
    }
}







curl 'https://api.freighttiger.com/api/journey-snapshot/v1/journeys/JRN-b1e94fd9-9ee9-42b2-ad40-b938593794ec/details/tracking/path?entity_type=CNR&journey_stop_type=source&journey_direction=outbound' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer\
  -H 'content-type: application/json' \
  -H 'origin: https://www.freighttiger.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://www.freighttiger.com/' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'


  {
    "success": true,
    "data": [
        {
            "device_id": "VIR-9fa07b15-76eb-4fba-bc44-1933fdcacfba",
            "actual_device_id": "SIM-156d5ca2-68a2-4a7b-8f6e-16fb745baa35",
            "device_time": 1770207966000,
            "lat": "22.46164",
            "lng": "87.92693",
            "accuracy": "0.00",
            "altitude": "0.000",
            "speed": "0.000",
            "course": "0.00",
            "attributes": {
                "provider_id": "jio",
                "location_source": "sim"
            },
            "status": null
        },
        {
            "device_id": "VIR-9fa07b15-76eb-4fba-bc44-1933fdcacfba",
            "actual_device_id": "SIM-156d5ca2-68a2-4a7b-8f6e-16fb745baa35",
            "device_time": 1770205829000,
            "lat": "22.40344",
            "lng": "87.68566",
            "accuracy": "0.00",
            "altitude": "0.000",
            "speed": "0.000",
            "course": "0.00",
            "attributes": {
                "provider_id": "jio",
                "location_source": "sim"
            },
            "status": null
        },
        {
            "device_id": "VIR-9fa07b15-76eb-4fba-bc44-1933fdcacfba",
            "actual_device_id": "SIM-156d5ca2-68a2-4a7b-8f6e-16fb745baa35",
            "device_time": 1770203860000,
            "lat": "22.39527",
            "lng": "87.49765",
            "accuracy": "0.00",
            "altitude": "0.000",
            "speed": "0.000",
            "course": "0.00",
            "attributes": {
                "provider_id": "jio",
                "location_source": "sim"
            },
            "status": null
        },
        {
            "device_id": "VIR-9fa07b15-76eb-4fba-bc44-1933fdcacfba",
            "actual_device_id": "SIM-156d5ca2-68a2-4a7b-8f6e-16fb745baa35",
            "device_time": 1770202833000,
            "lat": "22.38850",
            "lng": "87.49499",
            "accuracy": "0.00",
            "altitude": "0.000",
            "speed": "0.000",
            "course": "0.00",
            "attributes": {
                "provider_id": "jio",
                "location_source": "sim"
            },
            "status": null
        }
    ]
}





curl 'https://api.freighttiger.com/api/journey-snapshot/v1/journeys/JRN-0ff56d20-4f44-4b6f-9456-523b60011514/details/loads?entity_type=CNR&journey_stop_type=source&journey_direction=outbound' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer ' \
  -H 'content-type: application/json' \
  -H 'origin: https://www.freighttiger.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://www.freighttiger.com/' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'


  {
    "success": true,
    "data": {
        "loads": [
            {
                "load_id": 536691,
                "customer_load_id": "LOAD-1770209346710",
                "status": "IN_TRANSIT",
                "from": {
                    "address": "2080066 - 2080066 - VIJAY AUTOMOBILES - 2080066 - VIJAY AUTOMOBILES , Near Rajasthan Patrika,Old Industrial Area,,Alwar 2080066 - VIJAY AUTOMOBILES",
                    "label": "2080066 - VIJAY AUTOMOBILES",
                    "lat": 27.54262126,
                    "lng": 76.62799927,
                    "consignor_name": "TATA MOTORS LIMITED ",
                    "consignor_fteid": "BRH-a3faafe5-46f8-4c81-b9b4-234be5ebae32",
                    "phone_number": null,
                    "consignee_name": "VIJAY AUTOMOBILES",
                    "consignee_fteid": "COM-1b955c7a-273c-41e7-a28c-2f0aedc0bf47",
                    "consigne_phone_number": "9314716192,919314716192",
                    "stop_action_type": "pickup"
                },
                "to": {
                    "address": "2088668 - 2088668-JAGVIJAY MOTORS INDIA PVT LTD - 2088668-JAGVIJAY MOTORS INDIA PVT LTD-SH-25, JAIPUR BHIWADI MEGA HIGHWAY,ALWAR,301001- PINCODE--301001 2088668-JAGVIJAY MOTORS INDIA PVT LTD",
                    "label": "2088668 - JAGVIJAY MOTORS INDIA PVT LTD",
                    "lat": 27.4966161,
                    "lng": 76.5025742,
                    "consignor_name": "TATA MOTORS LIMITED ",
                    "consignor_fteid": "BRH-a3faafe5-46f8-4c81-b9b4-234be5ebae32",
                    "phone_number": null,
                    "consignee_name": "VIJAY AUTOMOBILES",
                    "consignee_fteid": "COM-1b955c7a-273c-41e7-a28c-2f0aedc0bf47",
                    "consigne_phone_number": "9314716192,919314716192",
                    "stop_action_type": "drop"
                },
                "consignee_fteid": "COM-1b955c7a-273c-41e7-a28c-2f0aedc0bf47",
                "consignor_fteid": "BRH-a3faafe5-46f8-4c81-b9b4-234be5ebae32",
                "invoices": [
                    {
                        "to_contact_email": [],
                        "so_release_date": null,
                        "do_quantity": 0,
                        "load_id": 536691,
                        "description": "",
                        "created_at": 1770209347312,
                        "associated_so_numbers": null,
                        "from_name": "",
                        "invoice_date": null,
                        "total_invoice_value": 0,
                        "from_billing_address": "",
                        "to_shipping_address": "",
                        "po_number": "",
                        "associated_do_numbers": null,
                        "updated_at": 1770209347312,
                        "item_details": [],
                        "price": {},
                        "from_contact_email": [],
                        "from_shipping_address": "",
                        "currency": "INR",
                        "do_number": "",
                        "invoice_number": "",
                        "to_contact_phone": [],
                        "do_date": null,
                        "eway_bill_expiry_date": null,
                        "fteid": "INV-18d75897-919d-49b4-a5e9-2dd9f6acf77c",
                        "to_name": "",
                        "so_number": "",
                        "custom_fields": {},
                        "tax": {},
                        "so_quantity": 0,
                        "to_gstin": "",
                        "to_billing_address": "",
                        "so_date": null,
                        "do_publish_date": null,
                        "eway_bill_no": "",
                        "from_contact_phone": [],
                        "from_gstin": ""
                    }
                ],
                "eta": "2026-02-05 04:26:18",
                "sta": null,
                "distance_remaining_from_destination": 35.468,
                "last_known_location": "8H7X+8XJ, Dabad colony, Poonkhar, Rajasthan 301414, India",
                "last_ping": "2026-02-05 03:19:18",
                "pickup_eta": null,
                "pickup_ata": null,
                "destination_ata": null,
                "analytics_endtime": null
            }
        ]
    }
}