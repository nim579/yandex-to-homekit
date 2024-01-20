import readline from 'readline';
import { authRequest, authComplete } from './yandex/api.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

authRequest().then(request => {
  console.log(`Go to ${request.verification_url} and paste the code: ${request.user_code}
After done please press ENTER:
  `);

  rl.on('line', async () => {
    try {
      await authComplete(request.device_code);
      rl.close();
      console.log('Authorization successful!');
    } catch (e) {
      console.log('You are not authorize application yet. Please press ENTER after done it: ');
    }
  });
});
