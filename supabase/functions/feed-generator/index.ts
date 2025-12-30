import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const companyId = url.searchParams.get("company_id");
        const portal = url.searchParams.get("portal") || "generic";

        // Supabase client setup
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!companyId) {
            return new Response("Missing company_id parameter", { status: 400 });
        }

        // Fetch publications for this portal that are "live"
        const { data: publications, error: pubError } = await supabase
            .from("portal_listing_publications")
            .select(`
        portal_listing_id,
        listing:listings (
          id, reference_number, title, description, price, currency,
          property_type, listing_type, number_of_bedrooms, number_of_bathrooms,
          area_size, area_unit, address, city, country,
          images, amenities, permit_number,
          agent:agents (name, email, phone, license_number, avatar_url),
          updated_at, created_at
        )
      `)
            .eq("company_id", companyId)
            .eq("status", "live")
            .eq("is_deleted", false);

        // Note: We might want to filter by portal_id if needed, but for now we assume 
        // the user wants all listings approved for *any* feed-based portal?
        // Actually, usually a feed is specific to a portal because often we publish subsets.
        // However, for simplicity V1, let's fetch ALL "live" publications for the requested portal type if passed,
        // or better yet, fetch by portal_id if passed.

        // If we passed 'portal=bayut', we should probably look up the portal ID or just use the string if we stored slug.
        // Let's assume we filter by the portal_id in publications if possible.
        // Since we don't have the ID handy from the URL string easily without a lookup, 
        // let's stick to the publications.portal_id matching if the user passed a UUID.
        // If the user passed 'bayut', we need to resolve it. 

        // For this iteration, let's just fetch ALL listings that have ANY publication record 
        // where the portal name matches or just ALL live listings for the company 
        // that are marked for XML feed distribution?

        // Simpler approach: Join with 'portals' table to filter by name.

        let query = supabase
            .from("portal_listing_publications")
            .select(`
        portal_title, portal_description, portal_price, portal_images,
        listing:listings (
            id, reference_number, title, description, price, currency,
            property_type, listing_type, number_of_bedrooms, number_of_bathrooms,
            area_size, area_unit, address, city, country, location,
            images, amenities, permit_number,
            agent:agents (name, email, phone, license_number, avatar_url),
            updated_at, created_at
        ),
        portals!inner(name)
      `)
            .eq("company_id", companyId)
            .eq("status", "live")
            .eq("is_deleted", false);

        if (portal && portal !== "generic") {
            query = query.ilike("portals.name", `%${portal}%`);
        }

        const { data: items, error } = await query;

        if (error) {
            return new Response(JSON.stringify(error), { status: 500, headers: corsHeaders });
        }

        // Generate XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<list>
    ${items.map((item: any) => {
            const l = item.listing;
            if (!l) return "";

            const title = item.portal_title || l.title;
            const desc = item.portal_description || l.description;
            const price = item.portal_price || l.price;
            const images = item.portal_images || l.images || [];
            const agent = l.agent || {};

            const lastUpdate = l.updated_at ? l.updated_at.replace("T", " ").split(".")[0] : "";

            return `
    <property last_update="${lastUpdate}" id="${l.id}">
        <reference_number>${escapeXml(l.reference_number || l.id)}</reference_number>
        <permit_number>${escapeXml(l.permit_number || "")}</permit_number>
        <offering_type>${l.listing_type === "Rent" ? "RR" : "CS"}</offering_type>
        <property_type>${escapeXml(l.property_type || "Apartment")}</property_type>
        <price_on_application>${price ? "0" : "1"}</price_on_application>
        <price>${price || 0}</price>
        <service_charge>0</service_charge>
        <cheques>4</cheques>
        <city>${escapeXml(l.city || l.address || "")}</city>
        <community>${escapeXml(l.location || "")}</community>
        <sub_community></sub_community>
        <title_en><![CDATA[${title || ""}]]></title_en>
        <description_en><![CDATA[${desc || ""}]]></description_en>
        <bedroom>${l.number_of_bedrooms || 0}</bedroom>
        <bathroom>${l.number_of_bathrooms || 0}</bathroom>
        <size>${l.area_size || 0}</size>
        <agent>
            <id>${agent.employee_number || agent.email || "1"}</id>
            <name><![CDATA[${agent.name || "Agent"}]]></name>
            <email>${agent.email || ""}</email>
            <phone>${agent.phone || ""}</phone>
            <photo>${agent.avatar_url || ""}</photo>
        </agent>
        <photo>
            ${images.map((img: string, i: number) => `
            <url last_update="${lastUpdate}" watermark="1">${escapeXml(img)}</url>
            `).join("")}
        </photo>
        <geopoint>${l.latitude || ""},${l.longitude || ""}</geopoint>
        <amenities>
           ${(l.amenities || []).map((a: string) => `<amenity>${escapeXml(a)}</amenity>`).join("")}
        </amenities>
    </property>`;
        }).join("\n")}
</list>`;

        // Return XML response
        return new Response(xml, {
            headers: {
                ...corsHeaders,
                "Content-Type": "application/xml; charset=utf-8",
                "Cache-Control": "max-age=300", // Cache for 5 mins
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

function escapeXml(unsafe: string): string {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}
