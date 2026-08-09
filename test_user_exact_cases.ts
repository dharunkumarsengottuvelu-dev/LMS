import { jobeService } from "./src/services/jobe/client";

async function runTests() {
  console.log("=========================================");
  console.log("EXACT TEST 1: Java Two Sum with Scanner");
  console.log("=========================================");
  const javaCode = `
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        int n = sc.nextInt();

        int[] nums = new int[n];

        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }

        int target = sc.nextInt();

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (nums[i] + nums[j] == target) {
                    System.out.println(i + " " + j);
                    return;
                }
            }
        }

        System.out.println("-1 -1");
    }
}
  `;
  const javaInput = "4\n2 7 11 15\n9\n";
  const javaRes = await jobeService.executeCode("java", javaCode, javaInput);
  console.log("Status:", javaRes.status.description);
  console.log("Stdout:", JSON.stringify(javaRes.stdout));
  console.log("Stderr:", JSON.stringify(javaRes.stderr));

  console.log("\n=========================================");
  console.log("EXACT TEST 2: Python n = int(input())");
  console.log("=========================================");
  const pyCode = "n = int(input())\nprint(n)\n";
  const pyRes = await jobeService.executeCode("python", pyCode, "10\n");
  console.log("Status:", pyRes.status.description);
  console.log("Stdout:", JSON.stringify(pyRes.stdout));

  console.log("\n=========================================");
  console.log("EXACT TEST 3: Java Scanner.nextInt() = 25");
  console.log("=========================================");
  const java2Code = `
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(sc.nextInt());
    }
}
  `;
  const java2Res = await jobeService.executeCode("java", java2Code, "25\n");
  console.log("Status:", java2Res.status.description);
  console.log("Stdout:", JSON.stringify(java2Res.stdout));
}

runTests();
