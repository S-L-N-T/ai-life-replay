/**
 * URL 处理工具库
 * 提供 URL 规范化、验证和调试功能
 */

/**
 * 深度修剪：移除所有空白符和隐形 Unicode 字符
 * 标准的 .trim() 会忽略一些隐形字符如 NBSP、零宽字符、BOM 等
 */
export function deepTrim(value: string): string {
  return value
    // 移除所有空白符和隐形 Unicode 字符
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\s]+/g, '')
    // 中文标点符号转英文
    .replace(/[：]/g, ':')
    .replace(/[／]/g, '/')
    .replace(/[．]/g, '.')
    .trim()
}

/**
 * 规范化 Base URL
 * - 深度修剪
 * - 自动修复缺失的协议
 * - 移除 /chat/completions 和 /models 后缀
 * - 移除末尾斜杠
 * - 最终验证URL有效性
 */
export function normalizeBaseURL(value: string): string {
  let baseURL = deepTrim(value)

  if (!baseURL) return baseURL

  // 自动添加协议（如果缺失）
  if (!/^https?:\/\//i.test(baseURL)) {
    baseURL = `https://${baseURL}`
  }

  // 移除末尾斜杠
  baseURL = baseURL.replace(/\/+$/, '')

  // 移除常见的不需要的后缀
  if (baseURL.endsWith('/chat/completions')) {
    baseURL = baseURL.substring(0, baseURL.length - 17)
  }
  if (baseURL.endsWith('/models')) {
    baseURL = baseURL.substring(0, baseURL.length - 7)
  }

  // 再次移除末尾斜杠（以防前面的删除操作暴露了斜杠）
  baseURL = baseURL.replace(/\/+$/, '')

  // 最终验证：确保规范化后的结果是可解析的 URL
  // 捕获边界情况如空协议 ("http:", "https:") 和双协议字符串
  // ("https://://example.com") 等规范化后出现的问题
  try {
    new URL(baseURL)
  } catch {
    return ''
  }

  return baseURL
}

/**
 * 将字符串转换为 Unicode 代码点表示
 * 用于调试隐形字符和非 ASCII 字符
 * 示例: "hello" -> "U+0068 U+0065 U+006C U+006C U+006F"
 */
export function dumpCodepoints(value: string): string {
  return [...value]
    .map((ch) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)
    .join(' ')
}
