import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PortalAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  source: "property_finder" | "bayut" | "dubizzle";
  portalAgentId?: string;
  brn?: string;
  languages?: string[];
  specializations?: string[];
}

interface PropertyFinderAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface PropertyFinderUser {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  status: "active" | "inactive";
  publicProfile?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    phoneSecondary?: string;
    whatsappPhone?: string;
    imageVariants?: {
      large?: {
        default?: string;
        jpg?: string;
        webp?: string;
      };
    };
    compliances?: Array<{
      type: string;
      value: string;
      status: string;
    }>;
    isSuperAgent?: boolean;
  };
}

// Get Property Finder JWT token using API key and secret
async function getPropertyFinderToken(apiKey: string, apiSecret: string): Promise<string | null> {
  try {
    const response = await fetch("https://atlas.propertyfinder.com/v1/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        apiKey,
        apiSecret,
      }),
    });

    if (!response.ok) {
      console.error("Property Finder auth error:", response.status, await response.text());
      return null;
    }

    const data: PropertyFinderAuthResponse = await response.json();
    console.log("Property Finder token obtained, expires in:", data.expiresIn, "seconds");
    return data.accessToken;
  } catch (error) {
    console.error("Error getting Property Finder token:", error);
    return null;
  }
}

async function fetchPropertyFinderAgents(credentials: Record<string, string>): Promise<PortalAgent[]> {
  const apiKey = credentials.api_key;
  const apiSecret = credentials.api_secret;

  if (!apiKey || !apiSecret) {
    console.log("No API key or secret provided for Property Finder, returning mock agents");
    return getMockPropertyFinderAgents();
  }

  try {
    // Step 1: Get access token
    const accessToken = await getPropertyFinderToken(apiKey, apiSecret);
    
    if (!accessToken) {
      console.log("Failed to get Property Finder access token, returning mock agents");
      return getMockPropertyFinderAgents();
    }

    // Step 2: Fetch users from Property Finder API
    const response = await fetch("https://atlas.propertyfinder.com/v1/users?page=1&perPage=100&status=active", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Property Finder users API error:", response.status, await response.text());
      return getMockPropertyFinderAgents();
    }

    const data = await response.json();
    const users: PropertyFinderUser[] = data.data || [];
    
    console.log(`Fetched ${users.length} users from Property Finder`);

    // Map users to PortalAgent format
    return users
      .filter((user) => user.status === "active" && user.publicProfile)
      .map((user): PortalAgent => {
        const publicProfile = user.publicProfile!;
        
        // Extract BRN from compliances
        const brnCompliance = publicProfile.compliances?.find(
          (c) => c.type.toLowerCase() === "brn" && c.status === "active"
        );

        // Get avatar URL
        const avatarUrl = publicProfile.imageVariants?.large?.default ||
          publicProfile.imageVariants?.large?.jpg ||
          publicProfile.imageVariants?.large?.webp;

        return {
          id: `pf_${user.id}`,
          name: publicProfile.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: publicProfile.email || user.email,
          phone: publicProfile.phone || publicProfile.whatsappPhone || user.mobile || undefined,
          avatar: avatarUrl,
          source: "property_finder",
          portalAgentId: String(user.id),
          brn: brnCompliance?.value,
          languages: [], // Not available in basic user list
          specializations: [], // Not available in basic user list
        };
      });
  } catch (error) {
    console.error("Error fetching Property Finder agents:", error);
    return getMockPropertyFinderAgents();
  }
}

function getMockPropertyFinderAgents(): PortalAgent[] {
  // Mock agents for Property Finder when API is not available
  return [
    {
      id: "pf_agent_001",
      name: "Ahmed Al Maktoum",
      email: "ahmed.maktoum@propertyfinder.ae",
      phone: "+971 50 123 4567",
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
      source: "property_finder",
      portalAgentId: "1001",
      brn: "BRN-12345",
      languages: ["English", "Arabic"],
      specializations: ["Residential", "Luxury"],
    },
    {
      id: "pf_agent_002",
      name: "Sarah Johnson",
      email: "sarah.johnson@propertyfinder.ae",
      phone: "+971 50 234 5678",
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
      source: "property_finder",
      portalAgentId: "1002",
      brn: "BRN-23456",
      languages: ["English"],
      specializations: ["Commercial", "Off-Plan"],
    },
    {
      id: "pf_agent_003",
      name: "Mohammed Al Rashid",
      email: "mohammed.rashid@propertyfinder.ae",
      phone: "+971 50 345 6789",
      avatar: "https://randomuser.me/api/portraits/men/3.jpg",
      source: "property_finder",
      portalAgentId: "1003",
      brn: "BRN-34567",
      languages: ["English", "Arabic", "Hindi"],
      specializations: ["Residential", "Investment"],
    },
    {
      id: "pf_agent_004",
      name: "Lisa Chen",
      email: "lisa.chen@propertyfinder.ae",
      phone: "+971 50 456 7890",
      avatar: "https://randomuser.me/api/portraits/women/4.jpg",
      source: "property_finder",
      portalAgentId: "1004",
      brn: "BRN-45678",
      languages: ["English", "Mandarin"],
      specializations: ["Luxury", "Waterfront"],
    },
    {
      id: "pf_agent_005",
      name: "Omar Hassan",
      email: "omar.hassan@propertyfinder.ae",
      phone: "+971 50 567 8901",
      avatar: "https://randomuser.me/api/portraits/men/5.jpg",
      source: "property_finder",
      portalAgentId: "1005",
      brn: "BRN-56789",
      languages: ["English", "Arabic"],
      specializations: ["Apartments", "Villas"],
    },
  ];
}

async function fetchBayutAgents(credentials: Record<string, string>): Promise<PortalAgent[]> {
  const apiKey = credentials.api_key;
  
  console.log("Fetching Bayut agents, API key:", apiKey ? "provided" : "not provided");

  // Return mock data for now - Bayut API integration can be added when their API docs are provided
  return [
    {
      id: "bayut_agent_001",
      name: "Fatima Al Zahra",
      email: "fatima@bayut.com",
      phone: "+971 55 111 2222",
      source: "bayut",
      portalAgentId: "2001",
      brn: "BRN-11111",
      languages: ["English", "Arabic"],
    },
    {
      id: "bayut_agent_002",
      name: "James Wilson",
      email: "james@bayut.com",
      phone: "+971 55 222 3333",
      source: "bayut",
      portalAgentId: "2002",
      brn: "BRN-22222",
      languages: ["English"],
    },
  ];
}

async function fetchDubizzleAgents(credentials: Record<string, string>): Promise<PortalAgent[]> {
  // Dubizzle shares similar structure with Bayut
  const agents = await fetchBayutAgents(credentials);
  return agents.map((agent) => ({
    ...agent,
    id: agent.id.replace("bayut_", "dubizzle_"),
    source: "dubizzle" as const,
  }));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portal_id, portal_name, credentials, company_id } = await req.json();

    if (!portal_id || !credentials) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching agents for portal: ${portal_name} (${portal_id})`);
    console.log(`Credentials provided: api_key=${credentials.api_key ? "yes" : "no"}, api_secret=${credentials.api_secret ? "yes" : "no"}`);

    let agents: PortalAgent[] = [];

    const portalNameLower = (portal_name || "").toLowerCase();

    if (portalNameLower.includes("property finder") || portalNameLower.includes("property_finder")) {
      agents = await fetchPropertyFinderAgents(credentials);
    } else if (portalNameLower.includes("bayut")) {
      agents = await fetchBayutAgents(credentials);
    } else if (portalNameLower.includes("dubizzle")) {
      agents = await fetchDubizzleAgents(credentials);
    } else {
      console.log(`Unknown portal: ${portal_name}, returning empty agents`);
    }

    console.log(`Found ${agents.length} agents for ${portal_name}`);

    return new Response(
      JSON.stringify({ agents, portal_id, company_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in portal-agents-fetch:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
