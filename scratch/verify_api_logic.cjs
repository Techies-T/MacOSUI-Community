const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath);

async function testManualSelectedRAGCombination() {
    console.log("Starting Manual Selected RAG Combination Logic Test...");
    
    const testPodId = "test-pod-manual-12345";
    
    // 1. Clean up potential previous test data
    await new Promise((resolve) => {
        db.run("DELETE FROM pods WHERE id = ?", [testPodId], () => {
            db.run("DELETE FROM knowledge_articles WHERE pod_id = ?", [testPodId], () => resolve());
        });
    });

    // 2. Insert dummy Pod
    await new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO pods (id, name, description) VALUES (?, ?, ?)",
            [testPodId, "Test Management", "A pod for testing purposes"],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
    console.log("Inserted test Pod.");

    // 3. Insert 5 dummy articles
    const articlesData = [
        { title: "Report Alpha", content: "Competitor analysis for product A.", created_at: "2026-06-01 10:00:00" },
        { title: "Report Beta", content: "Sales projection Q3.", created_at: "2026-06-02 10:00:00" },
        { title: "Report Gamma", content: "Financial statements FY25.", created_at: "2026-06-03 10:00:00" },
        { title: "Report Delta", content: "Market trends 2026.", created_at: "2026-06-04 10:00:00" },
        { title: "Report Epsilon", content: "HR audit results.", created_at: "2026-06-05 10:00:00" }
    ];

    const insertedIds = [];
    for (const art of articlesData) {
        const lastId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO knowledge_articles (title, content, tags, author_id, token_count, pod_id, created_at) 
                 VALUES (?, ?, '[]', 1, 100, ?, ?)`,
                [art.title, art.content, testPodId, art.created_at],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        insertedIds.push({ id: lastId, title: art.title });
    }
    console.log("Inserted 5 test articles. Generated IDs:", insertedIds);

    // Let's select 2 specific articles: Report Beta (index 1) and Report Delta (index 3)
    const selectedArticleIds = [insertedIds[1].id, insertedIds[3].id];
    console.log("Simulating selection of article IDs:", selectedArticleIds);

    // 4. Run the query server/routes/deepResearch.cjs uses to retrieve manual selected articles
    const articles = await new Promise((resolve) => {
        const placeholders = selectedArticleIds.map(() => "?").join(",");
        db.all(
            `SELECT title, content FROM knowledge_articles WHERE id IN (${placeholders}) ORDER BY created_at DESC`,
            selectedArticleIds,
            (err, rows) => {
                if (err) {
                    console.error("Failed to fetch selected articles for RAG:", err);
                    resolve([]);
                } else {
                    resolve(rows || []);
                }
            }
        );
    });

    console.log(`Retrieved ${articles.length} articles for RAG combination.`);
    
    // 5. Verify results
    if (articles.length !== 2) {
        console.error("❌ Test Failed: Should retrieve exactly 2 articles.");
    } else {
        const titles = articles.map(a => a.title);
        console.log("Retrieved titles:", titles);
        
        const expected = ["Report Delta", "Report Beta"]; // DESC by created_at
        const matches = titles.every((t, i) => t === expected[i]);
        
        if (matches) {
            console.log("✅ Test Passed: Successfully retrieved only the manually selected articles.");
            
            // Log built context
            let knowledgeContext = "--- 過去の関連調査・ナレッジベース (参考情報) ---\n";
            articles.forEach((art, idx) => {
                knowledgeContext += `【過去資料 ${idx + 1}】 タイトル: ${art.title}\n内容:\n${art.content}\n\n`;
            });
            knowledgeContext += "--------------------------------------------------\n";
            console.log("\nSimulated prompt context:\n", knowledgeContext);
        } else {
            console.error(`❌ Test Failed: Expected ${expected}, but got ${titles}`);
        }
    }

    // 6. Clean up test data
    await new Promise((resolve) => {
        db.run("DELETE FROM pods WHERE id = ?", [testPodId], () => {
            db.run("DELETE FROM knowledge_articles WHERE pod_id = ?", [testPodId], () => resolve());
        });
    });
    console.log("Cleaned up test data.");

    db.close();
}

testManualSelectedRAGCombination().catch(err => {
    console.error("Test failed with error:", err);
    db.close();
});
