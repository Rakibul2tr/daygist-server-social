// FILE: src/server.js
import "dotenv/config";
import mongoose from "mongoose";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocketServer } from "./socket/index.js";
import CountryCpc from "./models/countryCpc/countryCpc.model.js";

const PORT = process.env.PORT || 5050;


const server = http.createServer(app);
// init socket.io
initSocketServer(server);

console.log(
  "CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_ID1
,process.env.GOOGLE_CLIENT_ID2);
const countries = [
  { name: "Afghanistan", code: "AF", flag: "🇦🇫" },
  { name: "Albania", code: "AL", flag: "🇦🇱" },
  { name: "Algeria", code: "DZ", flag: "🇩🇿" },
  { name: "Andorra", code: "AD", flag: "🇦🇩" },
  { name: "Angola", code: "AO", flag: "🇦🇴" },
  { name: "Argentina", code: "AR", flag: "🇦🇷" },
  { name: "Armenia", code: "AM", flag: "🇦🇲" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "Austria", code: "AT", flag: "🇦🇹" },
  { name: "Azerbaijan", code: "AZ", flag: "🇦🇿" },

  { name: "Bahamas", code: "BS", flag: "🇧🇸" },
  { name: "Bahrain", code: "BH", flag: "🇧🇭" },
  { name: "Bangladesh", code: "BD", flag: "🇧🇩" },
  { name: "Barbados", code: "BB", flag: "🇧🇧" },
  { name: "Belarus", code: "BY", flag: "🇧🇾" },
  { name: "Belgium", code: "BE", flag: "🇧🇪" },
  { name: "Belize", code: "BZ", flag: "🇧🇿" },
  { name: "Benin", code: "BJ", flag: "🇧🇯" },
  { name: "Bhutan", code: "BT", flag: "🇧🇹" },
  { name: "Bolivia", code: "BO", flag: "🇧🇴" },

  { name: "Bosnia and Herzegovina", code: "BA", flag: "🇧🇦" },
  { name: "Botswana", code: "BW", flag: "🇧🇼" },
  { name: "Brazil", code: "BR", flag: "🇧🇷" },
  { name: "Brunei", code: "BN", flag: "🇧🇳" },
  { name: "Bulgaria", code: "BG", flag: "🇧🇬" },
  { name: "Burkina Faso", code: "BF", flag: "🇧🇫" },
  { name: "Burundi", code: "BI", flag: "🇧🇮" },
  { name: "Cambodia", code: "KH", flag: "🇰🇭" },
  { name: "Cameroon", code: "CM", flag: "🇨🇲" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },

  { name: "China", code: "CN", flag: "🇨🇳" },
  { name: "Colombia", code: "CO", flag: "🇨🇴" },
  { name: "Costa Rica", code: "CR", flag: "🇨🇷" },
  { name: "Croatia", code: "HR", flag: "🇭🇷" },
  { name: "Cuba", code: "CU", flag: "🇨🇺" },
  { name: "Cyprus", code: "CY", flag: "🇨🇾" },
  { name: "Czech Republic", code: "CZ", flag: "🇨🇿" },

  { name: "Denmark", code: "DK", flag: "🇩🇰" },
  { name: "Dominican Republic", code: "DO", flag: "🇩🇴" },

  { name: "Egypt", code: "EG", flag: "🇪🇬" },
  { name: "Estonia", code: "EE", flag: "🇪🇪" },
  { name: "Ethiopia", code: "ET", flag: "🇪🇹" },

  { name: "Finland", code: "FI", flag: "🇫🇮" },
  { name: "France", code: "FR", flag: "🇫🇷" },

  { name: "Germany", code: "DE", flag: "🇩🇪" },
  { name: "Ghana", code: "GH", flag: "🇬🇭" },
  { name: "Greece", code: "GR", flag: "🇬🇷" },

  { name: "Hungary", code: "HU", flag: "🇭🇺" },

  { name: "Iceland", code: "IS", flag: "🇮🇸" },
  { name: "India", code: "IN", flag: "🇮🇳" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩" },
  { name: "Iran", code: "IR", flag: "🇮🇷" },
  { name: "Iraq", code: "IQ", flag: "🇮🇶" },
  { name: "Ireland", code: "IE", flag: "🇮🇪" },
  { name: "Israel", code: "IL", flag: "🇮🇱" },
  { name: "Italy", code: "IT", flag: "🇮🇹" },

  { name: "Japan", code: "JP", flag: "🇯🇵" },

  { name: "Kenya", code: "KE", flag: "🇰🇪" },

  { name: "Malaysia", code: "MY", flag: "🇲🇾" },
  { name: "Maldives", code: "MV", flag: "🇲🇻" },
  { name: "Mexico", code: "MX", flag: "🇲🇽" },

  { name: "Nepal", code: "NP", flag: "🇳🇵" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },

  { name: "Pakistan", code: "PK", flag: "🇵🇰" },
  { name: "Philippines", code: "PH", flag: "🇵🇭" },
  { name: "Poland", code: "PL", flag: "🇵🇱" },
  { name: "Portugal", code: "PT", flag: "🇵🇹" },

  { name: "Qatar", code: "QA", flag: "🇶🇦" },

  { name: "Romania", code: "RO", flag: "🇷🇴" },
  { name: "Russia", code: "RU", flag: "🇷🇺" },

  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  { name: "Singapore", code: "SG", flag: "🇸🇬" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "South Korea", code: "KR", flag: "🇰🇷" },
  { name: "Spain", code: "ES", flag: "🇪🇸" },
  { name: "Sri Lanka", code: "LK", flag: "🇱🇰" },
  { name: "Sweden", code: "SE", flag: "🇸🇪" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭" },

  { name: "Thailand", code: "TH", flag: "🇹🇭" },
  { name: "Turkey", code: "TR", flag: "🇹🇷" },

  { name: "Ukraine", code: "UA", flag: "🇺🇦" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "United States", code: "US", flag: "🇺🇸" },

  { name: "Vietnam", code: "VN", flag: "🇻🇳" },
];

async function start() {
  try {
    await connectDB();
     server.listen(PORT, "0.0.0.0", () => {
       console.log("🚀 Server running on:", PORT);
     });

    const data = countries.map((country) => ({
      code: country.code.toUpperCase(),
      name: country.name,
      flag: country.flag || "",
      cpc: {
        daygist: 0,
        others: 0,
      },
      isActive: true,
    }));

    await CountryCpc.deleteMany({});

    await CountryCpc.insertMany(data);

    console.log(`✅ ${data.length} countries inserted successfully`);

    process.exit(0);

    const shutdown = async () => {
      console.log("🛑 Shutting down...");
      server.close(async () => {
        await mongoose.disconnect();
        console.log("✅ Mongo disconnected. Bye!");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("❌ Start failed:", err.message);
    process.exit(1);
  }
}

start();

