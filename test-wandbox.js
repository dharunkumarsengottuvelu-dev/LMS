const payload = {
  compiler: 'openjdk-head',
  code: 'public class Solution { public static void main(String[] args) { System.out.println("Hello from Wandbox"); } }'
};

fetch('https://wandbox.org/api/compile.json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(console.log).catch(console.error);
