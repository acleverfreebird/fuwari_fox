import { getCollection } from "astro:content";
import fs from "fs";
import { glob } from "glob";

/**
 * SEO检查脚本
 * 用于验证博客文章和页面的SEO合规性
 */

// 颜色输出
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
};

function log(color, ...args) {
	console.log(color, ...args, colors.reset);
}

async function checkPosts() {
	log(colors.cyan, "\n📝 检查文章SEO...\n");

	const posts = await getCollection("posts");
	const issues = [];
	let totalIssues = 0;

	for (const post of posts) {
		const { title, description } = post.data;
		const slug = post.slug;
		const postIssues = [];

		// 检查标题
		if (!title) {
			postIssues.push("❌ 缺少标题");
			totalIssues++;
		} else if (title.length < 15) {
			postIssues.push(`⚠️  标题过短 (${title.length}字符，建议15-30字符)`);
			totalIssues++;
		} else if (title.length > 60) {
			postIssues.push(`⚠️  标题过长 (${title.length}字符，建议15-30字符)`);
			totalIssues++;
		}

		// 检查描述
		if (!description) {
			postIssues.push("❌ 缺少描述");
			totalIssues++;
		} else if (description.length < 120) {
			postIssues.push(
				`⚠️  描述过短 (${description.length}字符，建议120-160字符)`,
			);
			totalIssues++;
		} else if (description.length > 160) {
			postIssues.push(
				`⚠️  描述过长 (${description.length}字符，建议120-160字符)`,
			);
			totalIssues++;
		}

		// 检查内容长度
		const content = post.body;
		const wordCount = content.length;
		if (wordCount < 800) {
			postIssues.push(`⚠️  内容过短 (${wordCount}字符，建议800字以上)`);
			totalIssues++;
		}

		if (postIssues.length > 0) {
			issues.push({
				file: slug,
				title: title || "无标题",
				issues: postIssues,
			});
		}
	}

	// 输出结果
	log(colors.blue, `📊 总文章数: ${posts.length}`);
	log(colors.yellow, `⚠️  发现问题: ${totalIssues}个`);
	log(colors.magenta, `📄 问题文章: ${issues.length}篇\n`);

	if (issues.length > 0) {
		issues.forEach((issue) => {
			log(colors.red, `\n📄 ${issue.file}`);
			log(colors.cyan, `   标题: ${issue.title}`);
			issue.issues.forEach((i) => {
				console.log(`   ${i}`);
			});
		});
	} else {
		log(colors.green, "✅ 所有文章SEO检查通过！");
	}

	return {
		posts: posts.length,
		issues: totalIssues,
		problemPosts: issues.length,
	};
}

async function checkH1Tags() {
	log(colors.cyan, "\n\n🏷️  检查H1标签...\n");

	const astroFiles = await glob("src/pages/**/*.astro");
	const issues = [];
	let totalIssues = 0;

	for (const file of astroFiles) {
		const content = fs.readFileSync(file, "utf-8");
		const h1Matches = content.match(/<h1[^>]*>/g);

		if (!h1Matches || h1Matches.length === 0) {
			issues.push({
				file,
				type: "❌ 缺少H1标签",
				count: 0,
			});
			totalIssues++;
		} else if (h1Matches.length > 1) {
			issues.push({
				file,
				type: "⚠️  多个H1标签",
				count: h1Matches.length,
			});
			totalIssues++;
		}
	}

	log(colors.blue, `📊 检查文件: ${astroFiles.length}`);
	log(colors.yellow, `⚠️  发现问题: ${totalIssues}个\n`);

	if (issues.length > 0) {
		issues.forEach((issue) => {
			log(colors.red, `${issue.type}: ${issue.file} (${issue.count}个)`);
		});
	} else {
		log(colors.green, "✅ 所有页面H1标签检查通过！");
	}

	return { files: astroFiles.length, issues: totalIssues };
}

async function checkDuplicates() {
	log(colors.cyan, "\n\n🔍 检查重复内容...\n");

	const posts = await getCollection("posts");
	const titles = {};
	const descriptions = {};
	let duplicateTitles = 0;
	let duplicateDescriptions = 0;

	posts.forEach((post) => {
		const { title, description } = post.data;

		// 检查重复标题
		if (title) {
			if (!titles[title]) {
				titles[title] = [];
			}
			titles[title].push(post.slug);
		}

		// 检查重复描述
		if (description) {
			if (!descriptions[description]) {
				descriptions[description] = [];
			}
			descriptions[description].push(post.slug);
		}
	});

	// 输出重复标题
	log(colors.yellow, "📋 重复标题:");
	Object.entries(titles).forEach(([title, slugs]) => {
		if (slugs.length > 1) {
			log(colors.red, `\n⚠️  "${title}"`);
			slugs.forEach((slug) => console.log(`   - ${slug}`));
			duplicateTitles++;
		}
	});

	if (duplicateTitles === 0) {
		log(colors.green, "✅ 没有重复标题");
	}

	// 输出重复描述
	log(colors.yellow, "\n📋 重复描述:");
	Object.entries(descriptions).forEach(([desc, slugs]) => {
		if (slugs.length > 1) {
			log(colors.red, `\n⚠️  "${desc.substring(0, 50)}..."`);
			slugs.forEach((slug) => console.log(`   - ${slug}`));
			duplicateDescriptions++;
		}
	});

	if (duplicateDescriptions === 0) {
		log(colors.green, "✅ 没有重复描述");
	}

	return { duplicateTitles, duplicateDescriptions };
}

async function generateReport() {
	log(colors.magenta, "\n" + "=".repeat(60));
	log(colors.magenta, "🔍 SEO检查报告");
	log(colors.magenta, "=".repeat(60));

	const postResults = await checkPosts();
	const h1Results = await checkH1Tags();
	const duplicateResults = await checkDuplicates();

	// 生成JSON报告
	const report = {
		timestamp: new Date().toISOString(),
		summary: {
			totalPosts: postResults.posts,
			postIssues: postResults.issues,
			problemPosts: postResults.problemPosts,
			h1Issues: h1Results.issues,
			duplicateTitles: duplicateResults.duplicateTitles,
			duplicateDescriptions: duplicateResults.duplicateDescriptions,
		},
	};

	fs.writeFileSync("seo-check-report.json", JSON.stringify(report, null, 2));

	log(colors.cyan, "\n" + "=".repeat(60));
	log(colors.cyan, "📊 总结");
	log(colors.cyan, "=".repeat(60));
	log(colors.blue, `总文章数: ${postResults.posts}`);
	log(colors.yellow, `文章SEO问题: ${postResults.issues}个`);
	log(colors.yellow, `H1标签问题: ${h1Results.issues}个`);
	log(colors.yellow, `重复标题: ${duplicateResults.duplicateTitles}个`);
	log(colors.yellow, `重复描述: ${duplicateResults.duplicateDescriptions}个`);

	const totalIssues =
		postResults.issues +
		h1Results.issues +
		duplicateResults.duplicateTitles +
		duplicateResults.duplicateDescriptions;

	if (totalIssues === 0) {
		log(colors.green, "\n✅ 恭喜！所有SEO检查通过！");
	} else {
		log(colors.red, `\n⚠️  总计发现 ${totalIssues} 个问题需要修复`);
	}

	log(colors.cyan, "\n📄 详细报告已保存到: seo-check-report.json\n");
}

generateReport().catch(console.error);
