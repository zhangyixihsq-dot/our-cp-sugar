declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.css'

declare module '*.png' {
  const dataUri: string
  export default dataUri
}

declare module '*.gif' {
  const dataUri: string
  export default dataUri
}

declare module '*.webp' {
  const dataUri: string
  export default dataUri
}
