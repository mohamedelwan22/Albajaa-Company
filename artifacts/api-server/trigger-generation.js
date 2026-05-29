import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET is missing from env");

const token = jwt.sign(
  { userId: "admin-main-id", email: "admin@albaja.com.iq", role: "SUPER_ADMIN" },
  SECRET,
  { expiresIn: "7d" }
);

const ticketIds = [
  "e35b7bbb-2f0d-4210-bd6c-58be506c42e3",
  "48d1944f-eedd-44f7-9965-7be194698eca",
  "bba5a37e-69af-4a88-842d-51b2bf433092",
  "90454f63-03a2-4e18-bd15-371b2bb790fb",
  "85fc89b7-652b-4a08-988e-0ca1ce471b59",
  "060c6b51-7fb6-41aa-8938-e9683ddc17f8",
  "712ea8d0-6b1c-4a31-8486-fff2d2827b38",
  "bca0a50b-9f9a-4ffa-a681-33db273d162d",
  "c8a1309b-d6b4-4d5d-bb43-213bc12aaea2",
  "d699f43c-6d5a-4c5c-9cfb-1238b9bb7e54",
  "40889897-98fe-4998-81fa-e86ba87ba22a",
  "79b9bf49-beef-483d-b4b3-0e788f6a6b2e",
  "92540765-c763-4054-9daf-27e55bf23688",
  "8466351a-c079-48c9-b024-cb80dd6da0ca",
  "2b1fe9f6-9635-46df-b318-872bf44f3ddb",
  "fee98015-6a36-43a2-b081-f26a4494e224",
  "b05fa08b-ef63-42af-b7e6-7ad15fd90ac7",
  "45c8d6ea-a43c-43b4-9568-d61d68fa465b",
  "91d94ce9-0da8-49eb-b32f-a509ce7a56ae",
  "3afffe24-93ef-4eab-93dc-452280130355",
  "f81d5999-faf2-40ec-a12c-d108faeae480",
  "011e2ccd-3b98-4b31-b050-1571540b3835",
  "3ddf6770-9720-4d9f-8f9b-74f32b2e8c46",
  "6880bf7c-2adc-4a59-9bd3-294af1a54b42",
  "80a20e5e-7f8e-4a8e-941a-27a324010938",
  "ae4faad6-c1f4-4a1f-a0d1-3bb375a014a5",
  "bc25f561-d9e6-4507-ac3f-106000034100",
  "59a89386-5c41-4349-8524-e56b0fdaef4a",
  "56edad34-3c63-468f-9d14-32110e23bc90",
  "2082dd6d-f31b-4cb0-aaa3-96ab892f84b8",
  "7e27e725-223a-4d9a-b530-adc22e67ab4b",
  "7640dfa6-51e5-4067-8eaa-4b9061e05fca",
  "638ccd62-c5f7-4745-9fd0-b1c69f6595ca",
  "2e359c3b-8a09-4b60-abe2-5e669cdfc773",
  "59465a9f-cf14-45f4-9130-16e4e1bf2c7b",
  "5b7cbc7e-f237-4e78-a76d-1e6d41da86ef",
  "541f1c36-e297-4a74-bda1-56dd3f1312d0",
  "35acd26b-9885-429b-b0b1-e86f7a1986ce",
  "b76f71f9-3b34-4ad9-8856-ca8bafca605f",
  "2197f099-7a77-48f2-91a1-fad4a28cff36",
  "a672b8dc-b75d-44a4-82e3-4865a928f5c5"
];

async function main() {
  for (const ticketId of ticketIds) {
    const url = `http://localhost:3001/api/tickets/${ticketId}/generate`;
    console.log(`Sending POST request for ticket ${ticketId}...`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      console.log(`Ticket ${ticketId} -> Status: ${res.status}`);
      const data = await res.json();
      if (res.status === 500) {
        console.log(`Found 500 Error for ticket ${ticketId}!`);
        console.log("Error details:", JSON.stringify(data, null, 2));
        break;
      }
    } catch (err) {
      console.error(`Failed to request ${ticketId}:`, err);
    }
  }
}

main().catch(console.error);
