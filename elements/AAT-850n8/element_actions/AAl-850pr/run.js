function(instance, properties, context) {
  if (!instance.data.quill) return;
  var quill = instance.data.quill;
  instance.publishState("field_is_focused", true);
  quill.focus();
}
