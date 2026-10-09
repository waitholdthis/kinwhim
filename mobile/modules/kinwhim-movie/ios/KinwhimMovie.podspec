Pod::Spec.new do |s|
  s.name           = 'KinwhimMovie'
  s.version        = '1.0.0'
  s.summary        = 'Renders Kinwhim memories into short MP4 movies'
  s.description    = 'AVAssetWriter-based renderer for Kinwhim mini movies'
  s.author         = 'Kinwhim'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
