#!/bin/bash
source .env.local
curl -H 'apikey:''' -H 'Authorization: Bearer ''' "https://iqarhmetoagfjjyfztzq.supabase.co/rest/v1/congeladores?usuario_id=eq.c4ceafa2-f99f-49a6-8760-710f9ad7da9e&select=id,nombre,cajones_congelador(id,nombre,posicion,descripcion,elementos_cajon(id,nombre))"
