export function readCookie(name, source = globalThis.document) {
  const prefix = `${name}=`
  const entry = (source?.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null
}

export function clearCookie(name, target = globalThis.document) {
  if (!target) return
  target.cookie = `${name}=; Max-Age=0; path=/`
}
