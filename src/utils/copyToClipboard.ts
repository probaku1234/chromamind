export const copyClipboard = async (
  text: string,
  successAction?: () => void,
  failAction?: () => void,
) => {
  try {
    await navigator.clipboard.writeText(text)
    if (successAction) {
      successAction()
    }
  } catch (error) {
    console.error('Failed to copy: ', error)
    if (failAction) {
      failAction()
    }
  }
}
