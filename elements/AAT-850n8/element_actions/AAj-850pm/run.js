function(instance, context) {
  const d = instance.data
  if (!d.quill) return
  // Not sure "reset" does not really make any sense with autobinding on,
  // but bubble still fires it
  if (d.is_autobound) return

  // set contents back to the initial value
  d.set_content_in_quill(d.initial_bbcode)

  d.last_change_source = 'api'
  d.has_been_edited = false
}
