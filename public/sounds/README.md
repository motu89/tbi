# Notification Sounds

This directory contains sound files used for notifications in the admin panel.

## Available Sounds

- `notification.mp3` - Default notification sound for new orders

## Adding Your Own Sounds

To add a custom notification sound:

1. Add your sound file to this directory (MP3 format recommended)
2. Update the reference in the admin.html file to use your sound file

Example:
```javascript
const audio = new Audio('/sounds/your-custom-sound.mp3');
```

## Sound Credits

Default sounds are royalty-free sounds from [Notification Sounds](https://notificationsounds.com/).

## Troubleshooting

If notification sounds aren't working:

- Make sure your browser allows autoplay of audio
- Check that the sound file exists and is properly formatted
- Verify file permissions are correct 