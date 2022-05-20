function(properties, context) {
	if (properties.empty_is_invalid) {
		return !!properties.initial_content || properties.bubble.auto_binding()
	}
	return true;
}
